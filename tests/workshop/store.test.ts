import { describe, expect, it } from "vitest";
import { Annotation } from "../../src/workshop/annotations";
import {
	Revision,
	addAnnotations,
	addRevision,
	clearResolved,
	createWorkshop,
	documents,
	pendingFor,
	readPersisted,
	removeAnnotation,
	sanitizeWorkshop,
	setActiveAnnotation,
	setAnnotationSeverity,
	setAnnotationStatus,
	setRevisionMajor,
} from "../../src/workshop/store";

function annotation(overrides: Partial<Annotation> = {}): Annotation {
	return {
		id: "a1",
		docPath: "Notes/Draft.md",
		role: "Editor",
		type: "edit",
		severity: "minor",
		quote: "the cat",
		replacement: "the dog",
		comment: "",
		range: { from: 0, to: 7 },
		status: "pending",
		createdAt: 1,
		...overrides,
	};
}

function revision(overrides: Partial<Revision> = {}): Revision {
	return {
		id: "r1",
		docPath: "Notes/Draft.md",
		createdAt: 1,
		role: "Editor",
		summary: "Applied edit suggestion",
		major: false,
		annotationId: "a1",
		before: "the cat",
		after: "the dog",
		...overrides,
	};
}

describe("suggestions", () => {
	it("adds new suggestions in front", () => {
		const state = addAnnotations(createWorkshop(), [
			annotation({ id: "new" }),
		]);

		expect(state.annotations.map((entry) => entry.id)).toEqual(["new"]);
	});

	it("keeps pending suggestions when trimming old resolved ones", () => {
		const resolved = Array.from({ length: 5 }, (_, index) =>
			annotation({
				id: `old-${index}`,
				status: "rejected",
				createdAt: index,
			}),
		);
		const state = addAnnotations(
			{ ...createWorkshop(), annotations: resolved },
			[annotation({ id: "pending" })],
			4,
		);

		expect(state.annotations).toHaveLength(4);
		expect(state.annotations[0]?.id).toBe("pending");
		expect(state.annotations.some((entry) => entry.id === "old-0")).toBe(
			false,
		);
	});

	it("tracks status and clears the active suggestion", () => {
		const state = setActiveAnnotation(
			{ ...createWorkshop(), annotations: [annotation()] },
			"a1",
		);
		const applied = setAnnotationStatus(state, "a1", "applied");

		expect(applied.annotations[0]?.status).toBe("applied");
		expect(applied.activeAnnotationId).toBeNull();
	});

	it("lets the user raise the severity of a suggestion", () => {
		const state = { ...createWorkshop(), annotations: [annotation()] };
		const major = setAnnotationSeverity(state, "a1", "major");

		expect(major.annotations[0]?.severity).toBe("major");
		expect(setAnnotationSeverity(major, "a1", "major")).toBe(major);
		expect(setAnnotationSeverity(state, "a1", "minor")).toBe(state);
		expect(setAnnotationSeverity(state, "nope", "major")).toBe(state);
	});

	it("drops a removed suggestion and its selection", () => {
		const state = setActiveAnnotation(
			{ ...createWorkshop(), annotations: [annotation()] },
			"a1",
		);
		const removed = removeAnnotation(state, "a1");

		expect(removed.annotations).toEqual([]);
		expect(removed.activeAnnotationId).toBeNull();
	});

	it("lists pending suggestions of a document in order", () => {
		const state = {
			...createWorkshop(),
			annotations: [
				annotation({ id: "b", range: { from: 20, to: 25 } }),
				annotation({ id: "done", status: "applied" }),
				annotation({ id: "a", range: { from: 1, to: 5 } }),
				annotation({ id: "other-doc", docPath: "Notes/Other.md" }),
			],
		};

		expect(pendingFor(state, "Notes/Draft.md").map((e) => e.id)).toEqual([
			"a",
			"b",
		]);
	});

	it("clears only the resolved suggestions of one document", () => {
		const state = {
			...createWorkshop(),
			annotations: [
				annotation({ id: "applied", status: "applied" }),
				annotation({ id: "pending" }),
				annotation({
					id: "other",
					docPath: "Notes/Other.md",
					status: "applied",
				}),
			],
		};

		const cleared = clearResolved(state, "Notes/Draft.md");

		expect(cleared.annotations.map((entry) => entry.id)).toEqual([
			"pending",
			"other",
		]);
	});

	it("summarises documents by pending count", () => {
		const state = {
			...createWorkshop(),
			annotations: [
				annotation({ id: "1" }),
				annotation({ id: "2" }),
				annotation({ id: "3", status: "applied" }),
				annotation({
					id: "4",
					docPath: "Notes/Other.md",
					status: "applied",
				}),
			],
		};

		expect(documents(state)).toEqual([
			{ docPath: "Notes/Draft.md", pending: 2, total: 3 },
			{ docPath: "Notes/Other.md", pending: 0, total: 1 },
		]);
	});
});

describe("revisions", () => {
	it("keeps the newest revisions first and caps the log", () => {
		let state = createWorkshop();
		for (let index = 0; index < 5; index += 1) {
			state = addRevision(
				state,
				revision({ id: `r${index}`, createdAt: index }),
				3,
			);
		}

		expect(state.revisions.map((entry) => entry.id)).toEqual([
			"r4",
			"r3",
			"r2",
		]);
	});

	it("lets the user flag a revision as major", () => {
		const state = addRevision(createWorkshop(), revision());

		expect(setRevisionMajor(state, "r1", true).revisions[0]?.major).toBe(
			true,
		);
		expect(setRevisionMajor(state, "nope", true)).toBe(state);
	});
});

describe("stored data", () => {
	it("reads data written before the workshop existed as settings", () => {
		const persisted = readPersisted({
			model: "gpt-4o",
			rolesFolder: "Modai roles",
		});

		expect(persisted.settings).toMatchObject({ model: "gpt-4o" });
		expect(persisted.workshop).toEqual(createWorkshop());
	});

	it("reads the current data shape", () => {
		const persisted = readPersisted({
			version: 1,
			settings: { model: "gemini-2.5-flash" },
			workshop: {
				annotations: [annotation()],
				revisions: [revision()],
				activeAnnotationId: "a1",
			},
		});

		expect(persisted.settings).toMatchObject({ model: "gemini-2.5-flash" });
		expect(persisted.workshop.annotations).toHaveLength(1);
		expect(persisted.workshop.revisions).toHaveLength(1);
		expect(persisted.workshop.activeAnnotationId).toBe("a1");
	});

	it("survives hand edited data", () => {
		const workshop = sanitizeWorkshop({
			annotations: [
				annotation(),
				{ id: "no-doc-path" },
				"nonsense",
				{ id: "b", docPath: "Notes/Other.md", status: "weird" },
			],
			revisions: [revision(), { id: "broken" }],
			activeAnnotationId: 7,
		});

		expect(workshop.annotations.map((entry) => entry.id)).toEqual([
			"a1",
			"b",
		]);
		expect(workshop.annotations[1]?.status).toBe("pending");
		expect(workshop.revisions).toHaveLength(1);
		expect(workshop.activeAnnotationId).toBeNull();
	});

	it("returns an empty workshop for junk", () => {
		expect(sanitizeWorkshop(null)).toEqual(createWorkshop());
		expect(sanitizeWorkshop("nope")).toEqual(createWorkshop());
	});
});
