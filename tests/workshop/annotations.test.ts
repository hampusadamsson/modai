import { describe, expect, it } from "vitest";
import {
	Annotation,
	applyAnnotation,
	isStale,
	locateRange,
	orderedPending,
	stepAnnotation,
} from "../../src/workshop/annotations";

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
		range: { from: 4, to: 11 },
		status: "pending",
		createdAt: 1,
		...overrides,
	};
}

describe("locateRange", () => {
	it("keeps the recorded range while the quote is still there", () => {
		const text = "A the cat sat.";

		expect(locateRange(text, annotation())).toEqual({ from: 2, to: 9 });
	});

	it("finds the quote again after an edit moved it", () => {
		const text = "Intro. A the cat sat.";

		expect(locateRange(text, annotation())).toEqual({ from: 9, to: 16 });
	});

	it("reports nothing when the quote is gone", () => {
		expect(locateRange("A the puppy sat.", annotation())).toBeNull();
		expect(isStale("A the puppy sat.", annotation())).toBe(true);
	});

	it("never anchors a document level note", () => {
		expect(locateRange("any text", annotation({ quote: "" }))).toBeNull();
		expect(isStale("any text", annotation({ quote: "" }))).toBe(false);
	});
});

describe("applyAnnotation", () => {
	it("replaces the quoted text", () => {
		expect(applyAnnotation("A the cat sat.", annotation())).toBe(
			"A the dog sat.",
		);
	});

	it("returns null when the quote is gone", () => {
		expect(applyAnnotation("Nothing here.", annotation())).toBeNull();
	});

	it("deletes the quote when the replacement is empty", () => {
		expect(
			applyAnnotation("A the cat sat.", annotation({ replacement: "" })),
		).toBe("A  sat.");
	});
});

describe("orderedPending", () => {
	it("orders by position and drops resolved suggestions", () => {
		const annotations = [
			annotation({ id: "later", range: { from: 30, to: 33 } }),
			annotation({ id: "done", status: "applied" }),
			annotation({ id: "earlier", range: { from: 2, to: 5 } }),
			annotation({ id: "unanchored", range: null }),
		];

		expect(orderedPending(annotations).map((entry) => entry.id)).toEqual([
			"earlier",
			"later",
			"unanchored",
		]);
	});
});

describe("stepAnnotation", () => {
	const pending = [
		annotation({ id: "one" }),
		annotation({ id: "two" }),
		annotation({ id: "three" }),
	];

	it("moves forward and wraps around", () => {
		expect(stepAnnotation(pending, "one", 1)).toBe("two");
		expect(stepAnnotation(pending, "three", 1)).toBe("one");
	});

	it("moves backward and wraps around", () => {
		expect(stepAnnotation(pending, "one", -1)).toBe("three");
		expect(stepAnnotation(pending, "two", -1)).toBe("one");
	});

	it("starts at either end when nothing is selected", () => {
		expect(stepAnnotation(pending, null, 1)).toBe("one");
		expect(stepAnnotation(pending, null, -1)).toBe("three");
	});

	it("selects the only suggestion even from a stale id", () => {
		expect(stepAnnotation([pending[0]!], "gone", 1)).toBe("one");
	});

	it("has nothing to select when everything is resolved", () => {
		expect(stepAnnotation([], "one", 1)).toBeNull();
	});
});
