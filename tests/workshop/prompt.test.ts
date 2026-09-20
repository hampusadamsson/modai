import { describe, expect, it } from "vitest";
import { Role } from "../../src/roles";
import {
	buildPassPrompt,
	extractJson,
	parsePassResponse,
} from "../../src/workshop/prompt";

const DOC = "The cat sat on the mat. It was a sunny day.";

function role(overrides: Partial<Role> = {}): Role {
	return {
		name: "Editor",
		instructions: "### ROLE\nYou are a copy editor.",
		mode: "edit",
		path: "Modai roles/Editor.md",
		...overrides,
	};
}

const options = (
	overrides: Partial<Parameters<typeof parsePassResponse>[1]>,
) => ({
	docPath: "Notes/Draft.md",
	docText: DOC,
	role: role(),
	idFactory: () => "generated",
	now: 42,
	...overrides,
});

describe("buildPassPrompt", () => {
	it("asks for JSON annotations and includes the document", () => {
		const prompt = buildPassPrompt(role(), DOC);

		expect(prompt).toContain("You are a copy editor.");
		expect(prompt).toContain('"annotations"');
		expect(prompt).toContain(DOC);
	});

	it("asks edit roles for a replacement and feedback roles for a comment", () => {
		expect(buildPassPrompt(role(), DOC)).toContain(
			"must contain the rewritten text",
		);
		expect(buildPassPrompt(role({ mode: "feedback" }), DOC)).toContain(
			'Explain the problem in "comment"',
		);
	});
});

describe("extractJson", () => {
	it("reads a bare object", () => {
		expect(extractJson('{"annotations":[]}')).toEqual({ annotations: [] });
	});

	it("ignores markdown fences and surrounding prose", () => {
		const raw =
			'Here you go:\n```json\n{"annotations":[{"quote":"a"}]}\n```\nHope that helps!';

		expect(extractJson(raw)).toEqual({ annotations: [{ quote: "a" }] });
	});

	it("reads a bare array", () => {
		expect(extractJson('[{"quote":"a"}]')).toEqual([{ quote: "a" }]);
	});

	it("returns null for prose", () => {
		expect(extractJson("The text is fine, no changes needed.")).toBeNull();
	});

	it("returns null for truncated json", () => {
		expect(extractJson('{"annotations":[{"quote":"a"')).toBeNull();
	});
});

describe("parsePassResponse", () => {
	it("anchors the quoted suggestions in the document", () => {
		const raw = JSON.stringify({
			annotations: [
				{
					quote: "The cat sat on the mat.",
					replacement: "The cat lounged on the mat.",
					comment: "Stronger verb.",
					severity: "minor",
				},
			],
		});

		const result = parsePassResponse(raw, options({}));

		expect(result.skipped).toBe(0);
		expect(result.rewrite).toBe(false);
		expect(result.annotations).toEqual([
			{
				id: "generated",
				docPath: "Notes/Draft.md",
				role: "Editor",
				type: "edit",
				severity: "minor",
				quote: "The cat sat on the mat.",
				replacement: "The cat lounged on the mat.",
				comment: "Stronger verb.",
				range: { from: 0, to: 23 },
				status: "pending",
				createdAt: 42,
			},
		]);
	});

	it("counts suggestions whose quote is not in the document", () => {
		const raw = JSON.stringify({
			annotations: [
				{ quote: "text that is not there", replacement: "x" },
				{
					quote: "It was a sunny day.",
					replacement: "The sun blazed.",
				},
			],
		});

		const result = parsePassResponse(raw, options({}));

		expect(result.skipped).toBe(1);
		expect(result.annotations).toHaveLength(1);
	});

	it("keeps a document level note without a quote", () => {
		const raw = JSON.stringify({
			annotations: [{ quote: "", comment: "The ending is rushed." }],
		});

		const result = parsePassResponse(
			raw,
			options({ role: role({ mode: "feedback" }) }),
		);

		expect(result.annotations[0]).toMatchObject({
			quote: "",
			comment: "The ending is rushed.",
			type: "feedback",
			range: null,
		});
	});

	it("marks severity and defaults it to minor", () => {
		const raw = JSON.stringify({
			annotations: [
				{ quote: "The cat", replacement: "A cat", severity: "major" },
				{ quote: "sunny day", replacement: "blue sky" },
			],
		});

		const result = parsePassResponse(raw, options({}));

		expect(result.annotations.map((entry) => entry.severity)).toEqual([
			"major",
			"minor",
		]);
	});

	it("drops duplicates and empty entries", () => {
		const raw = JSON.stringify({
			annotations: [
				{ quote: "The cat", replacement: "A cat" },
				{ quote: "The cat", replacement: "A cat" },
				{ quote: "", replacement: "", comment: "" },
				"nonsense",
			],
		});

		const result = parsePassResponse(raw, options({}));

		expect(result.annotations).toHaveLength(1);
		expect(result.skipped).toBe(2);
	});

	it("splits a rewritten document into suggestions", () => {
		const rewritten =
			"The cat lounged on the mat. It was a bright, sunny day.";

		const result = parsePassResponse(rewritten, options({}));

		expect(result.rewrite).toBe(true);
		expect(result.annotations.length).toBeGreaterThan(0);
		for (const annotation of result.annotations) {
			expect(DOC).toContain(annotation.quote);
		}
	});

	it("does not treat feedback prose as a rewrite", () => {
		const feedback =
			"The piece is strong, but the middle sags and the ending is rushed. " +
			"Consider cutting the second paragraph entirely and rebuilding the close.";

		const result = parsePassResponse(
			feedback,
			options({ role: role({ mode: "feedback" }) }),
		);

		expect(result.rewrite).toBe(false);
		expect(result.annotations).toEqual([]);
	});

	it("ignores an empty response", () => {
		expect(parsePassResponse("", options({}))).toEqual({
			annotations: [],
			skipped: 0,
			rewrite: false,
		});
	});
});
