import { describe, expect, it } from "vitest";
import { diffParts, splitIntoHunks } from "../../src/workshop/diff";

const kindOf = (parts: ReturnType<typeof diffParts>, value: string) =>
	parts.find((part) => part.value === value)?.kind;

describe("diffParts", () => {
	it("marks the changed words and leaves the rest untouched", () => {
		const parts = diffParts("The cat sat.", "The dog sat.");

		expect(kindOf(parts, "dog")).toBe("added");
		expect(kindOf(parts, "cat")).toBe("removed");
		expect(kindOf(parts, " sat.")).toBe("unchanged");
	});

	it("describes an insertion into empty text", () => {
		expect(diffParts("", "brand new")).toEqual([
			{ value: "brand new", kind: "added" },
		]);
	});

	it("describes a deletion to empty text", () => {
		expect(diffParts("all gone", "")).toEqual([
			{ value: "all gone", kind: "removed" },
		]);
	});

	it("reports unchanged text as a single unchanged part", () => {
		const parts = diffParts("same text", "same text");

		expect(parts).toHaveLength(1);
		expect(parts[0]?.kind).toBe("unchanged");
		expect(parts[0]?.value).toBe("same text");
	});
});

describe("splitIntoHunks", () => {
	it("turns one rewritten sentence into a single suggestion", () => {
		const rewrites = splitIntoHunks(
			"The cat sat on the mat.",
			"The cat lounged on the mat.",
		);

		expect(rewrites).toHaveLength(1);
		expect(rewrites[0]?.quote).toContain("cat");
		expect(rewrites[0]?.replacement).toContain("lounged");
	});

	it("splits distant changes into separate suggestions", () => {
		const rewrites = splitIntoHunks(
			"First sentence stays. Second one changes here. Last sentence stays.",
			"First sentence stays. Second one morphs here. Last sentence stays.",
		);

		expect(rewrites).toHaveLength(1);
		expect(rewrites[0]?.replacement).toContain("morphs");
	});

	it("keeps nearby changes in one suggestion", () => {
		const oldText = "Alpha bravo charlie delta.";
		const newText = "Alpha BRAVO charlie DELTA.";

		const rewrites = splitIntoHunks(oldText, newText);
		expect(rewrites).toHaveLength(1);
		expect(rewrites[0]?.quote).toBe("Alpha bravo charlie delta");
		expect(rewrites[0]?.replacement).toBe("Alpha BRAVO charlie DELTA");
	});

	it("carries context so a pure insertion can be found again", () => {
		const rewrites = splitIntoHunks("The end.", "The very end.");

		expect(rewrites).toHaveLength(1);
		expect(rewrites[0]?.quote).not.toBe("");
		expect(rewrites[0]?.replacement).toContain("very");
	});

	it("returns nothing when the text is unchanged", () => {
		expect(splitIntoHunks("Same text.", "Same text.")).toEqual([]);
	});

	it("quotes text that appears in the document", () => {
		const oldText =
			"One paragraph that is long enough to hold several sentences. " +
			"A second paragraph with its own wording here. " +
			"A third paragraph closing the document off.";

		const newText = oldText.replace(
			"its own wording",
			"different phrasing",
		);

		for (const rewrite of splitIntoHunks(oldText, newText)) {
			expect(oldText).toContain(rewrite.quote);
		}
	});
});
