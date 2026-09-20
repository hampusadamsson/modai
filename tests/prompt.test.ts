import { describe, expect, it } from "vitest";
import { buildPrompt } from "../src/prompt";

describe("buildPrompt", () => {
	it("appends the input text to the instructions", () => {
		const prompt = buildPrompt("### ROLE\nEditor", "Some text.");

		expect(prompt).toBe(
			"### ROLE\nEditor\n\t\t\t### INPUT TEXT\n\t\t\tSome text.",
		);
	});

	it("keeps multi-line input intact", () => {
		const prompt = buildPrompt("do it", "line one\n\nline two");

		expect(prompt.endsWith("\n\t\t\tline one\n\nline two")).toBe(true);
	});
});
