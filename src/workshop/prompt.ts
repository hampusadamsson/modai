import { Role } from "../roles";
import { Annotation, Severity, locateRange } from "./annotations";
import { splitIntoHunks } from "./diff";

export interface ParseOptions {
	docPath: string;
	docText: string;
	role: Role;
	idFactory?: () => string;
	now?: number;
}

export interface ParseResult {
	annotations: Annotation[];
	/** Quoted suggestions that could not be found in the document. */
	skipped: number;
	/** True when the response was a rewritten document rather than JSON. */
	rewrite: boolean;
}

/**
 * Instructions for a workshop pass. The model answers with JSON annotations,
 * so its suggestions can be anchored to the text they talk about.
 */
export function buildPassPrompt(role: Role, docText: string): string {
	const modeRule =
		role.mode === "edit"
			? '- Every annotation must contain the rewritten text in "replacement".'
			: '- Explain the problem in "comment" and add a concrete rewrite in "replacement" when you have one; leave it empty when you only have a remark.';

	return `${role.instructions}

### WORKSHOP OUTPUT
Answer with JSON only. No markdown fences, no text before or after it:
{"annotations":[{"quote":"...","replacement":"...","comment":"...","severity":"minor"}]}

Rules:
- "quote" is text copied verbatim from the document below, as short as it can be while still being unique in the document.
- ${modeRule}
- "severity" is "major" for structural, argument or clarity problems, "minor" for wording and mechanics.
- Answer {"annotations":[]} when you have nothing to suggest.

### DOCUMENT
${docText}`;
}

/** First JSON object or array in `raw`, ignoring markdown fences and prose. */
/** JSON spans of `candidate`, the outermost one first. */
function jsonSpans(candidate: string): string[] {
	return (
		[
			["{", "}"],
			["[", "]"],
		] as const
	)
		.map(([open, close]) => ({
			start: candidate.indexOf(open),
			end: candidate.lastIndexOf(close),
		}))
		.filter(({ start, end }) => start !== -1 && end > start)
		.sort((a, b) => a.start - b.start)
		.map(({ start, end }) => candidate.slice(start, end + 1));
}

export function extractJson(raw: string): unknown {
	const fenced = /```(?:json)?\s*([\s\S]*?)```/i.exec(raw);
	const candidate = (fenced?.[1] ?? raw).trim();

	for (const span of jsonSpans(candidate)) {
		try {
			return JSON.parse(span) as unknown;
		} catch {
			// Try the next span.
		}
	}

	return null;
}

function asDrafts(value: unknown): unknown[] {
	if (Array.isArray(value)) return value;
	if (typeof value === "object" && value !== null) {
		const annotations = (value as { annotations?: unknown }).annotations;
		if (Array.isArray(annotations)) return annotations;
	}

	return [];
}

function asText(value: unknown): string {
	return typeof value === "string" ? value : "";
}

function asSeverity(value: unknown): Severity {
	return value === "major" ? "major" : "minor";
}

/** Turns one parsed entry into an annotation, or `null` when it is unusable. */
function draftToAnnotation(
	draft: unknown,
	options: ParseOptions,
	idFactory: () => string,
	now: number,
): Annotation | null {
	if (typeof draft !== "object" || draft === null) return null;

	const entry = draft as Record<string, unknown>;
	const quote = asText(entry.quote);
	const replacement = asText(entry.replacement);
	const comment = asText(entry.comment);

	if (quote === "" && replacement === "" && comment === "") return null;

	const annotation: Annotation = {
		id: idFactory(),
		docPath: options.docPath,
		role: options.role.name,
		type: options.role.mode,
		severity: asSeverity(entry.severity),
		quote,
		replacement,
		comment,
		range: null,
		status: "pending",
		createdAt: now,
	};

	if (quote !== "" && locateRange(options.docText, annotation) === null) {
		return null;
	}

	annotation.range = locateRange(options.docText, annotation);

	return annotation;
}

/**
 * Reads a pass response. JSON annotations are used as they are; when the model
 * answered with a rewritten document instead (an edit role that ignored the
 * format), the rewrite is split into applicable suggestions.
 */
export function parsePassResponse(
	raw: string,
	options: ParseOptions,
): ParseResult {
	const idFactory = options.idFactory ?? (() => `annotation-${Date.now()}`);
	const now = options.now ?? Date.now();
	const drafts = asDrafts(extractJson(raw));

	if (drafts.length === 0 && raw.trim() !== "") {
		const rewrite =
			options.role.mode === "edit" &&
			options.docText.trim() !== "" &&
			raw.trim().length >= options.docText.trim().length * 0.5;

		if (rewrite) {
			return {
				annotations: splitIntoHunks(options.docText, raw.trim())
					.map((part) =>
						draftToAnnotation(part, options, idFactory, now),
					)
					.filter(
						(annotation): annotation is Annotation =>
							annotation !== null,
					),
				skipped: 0,
				rewrite: true,
			};
		}

		return { annotations: [], skipped: 0, rewrite: false };
	}

	const annotations: Annotation[] = [];
	const seen = new Set<string>();
	let skipped = 0;

	for (const draft of drafts) {
		const annotation = draftToAnnotation(draft, options, idFactory, now);
		if (!annotation) {
			skipped += 1;
			continue;
		}

		const key = `${annotation.quote}\u0000${annotation.replacement}`;
		if (seen.has(key)) continue;
		seen.add(key);

		annotations.push(annotation);
	}

	return { annotations, skipped, rewrite: false };
}
