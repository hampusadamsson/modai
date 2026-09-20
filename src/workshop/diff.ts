import { diffWords } from "diff";

type DiffKind = "added" | "removed" | "unchanged";

export type DiffPart = {
	value: string;
	kind: DiffKind;
};

/** A suggested change: the quoted text and what should replace it. */
export interface Rewrite {
	quote: string;
	replacement: string;
}

/** Word level diff between the original text and the model's output. */
export function diffParts(oldText: string, newText: string): DiffPart[] {
	return diffWords(oldText, newText).map((part) => ({
		value: part.value,
		kind: part.added ? "added" : part.removed ? "removed" : "unchanged",
	}));
}

/**
 * Splits a rewritten text into suggestions that can be applied one by one.
 * Changes separated by more than `maxGap` unchanged characters become separate
 * suggestions; every suggestion carries enough unchanged context to be found
 * in the document again (which also makes pure insertions anchorable).
 */
export function splitIntoHunks(
	oldText: string,
	newText: string,
	maxGap = 80,
	contextChars = 20,
): Rewrite[] {
	const rewrites: Rewrite[] = [];
	let quote = "";
	let replacement = "";
	let gap = "";
	let context = "";

	const flush = () => {
		if (quote !== "" || replacement !== "") {
			rewrites.push({ quote, replacement });
		}
		quote = "";
		replacement = "";
		gap = "";
	};

	for (const part of diffWords(oldText, newText)) {
		if (part.added || part.removed) {
			if (quote === "" && replacement === "") {
				quote = context;
				replacement = context;
			}
			quote += gap + (part.removed ? part.value : "");
			replacement += gap + (part.added ? part.value : "");
			gap = "";
			continue;
		}

		if (quote === "" && replacement === "") {
			// Leading text is only kept as context for a following change.
			context = (context + part.value).slice(-contextChars);
			continue;
		}

		gap += part.value;
		if (gap.length > maxGap) flush();
	}

	flush();

	return rewrites;
}
