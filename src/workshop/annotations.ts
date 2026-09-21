import { DiffPart, diffParts } from "./diff";

/** How a review item was produced, and what it does to the text. */
export type AnnotationType = "edit" | "review";

export type AnnotationStatus = "pending" | "applied" | "rejected";

export type Severity = "minor" | "major";

/** Character offsets into the document the annotation was created for. */
export interface AnnotationRange {
	from: number;
	to: number;
}

export interface Annotation {
	id: string;
	docPath: string;
	/** Role (or "Custom instruction") that produced the item. */
	role: string;
	type: AnnotationType;
	severity: Severity;
	/** Text quoted from the document; empty for a document level note. */
	quote: string;
	/** Text that replaces `quote`; empty when nothing is suggested. */
	replacement: string;
	/** The model's explanation, shown in the sidebar. */
	comment: string;
	/** Offsets of `quote` when the annotation was created. */
	range: AnnotationRange | null;
	status: AnnotationStatus;
	createdAt: number;
}

/**
 * Offsets of the quoted text in `text`, reusing the recorded offsets while
 * they still point at the quote and searching for it otherwise.
 */
export function locateRange(
	text: string,
	annotation: Annotation,
): AnnotationRange | null {
	const { quote, range } = annotation;
	if (quote === "") return null;

	if (range && text.startsWith(quote, range.from)) return range;

	const from = text.indexOf(quote);

	return from === -1 ? null : { from, to: from + quote.length };
}

/** Whether the quoted text is no longer part of the document. */
export function isStale(text: string, annotation: Annotation): boolean {
	return annotation.quote !== "" && locateRange(text, annotation) === null;
}

/** The document with this annotation applied, or `null` when it cannot be found. */
export function applyAnnotation(
	text: string,
	annotation: Annotation,
): string | null {
	const range = locateRange(text, annotation);
	if (!range) return null;

	return (
		text.slice(0, range.from) +
		annotation.replacement +
		text.slice(range.to)
	);
}

/** Diff shown for an item: quoted text against its replacement. */
export function diffFor(annotation: Annotation): DiffPart[] {
	return diffParts(annotation.quote, annotation.replacement);
}

/** Pending items in document order; unanchored ones come last. */
export function orderedPending(annotations: Annotation[]): Annotation[] {
	return annotations
		.filter((annotation) => annotation.status === "pending")
		.sort((a, b) => {
			const left = a.range?.from ?? Number.MAX_SAFE_INTEGER;
			const right = b.range?.from ?? Number.MAX_SAFE_INTEGER;

			return left - right || a.createdAt - b.createdAt;
		});
}

/** The review target: the active item, or the first one still open. */
export function currentPending(
	annotations: Annotation[],
	activeId: string | null,
): Annotation | null {
	const pending = orderedPending(annotations);
	const active = pending.find((annotation) => annotation.id === activeId);

	return active ?? pending[0] ?? null;
}

/**
 * First open item at or after `position`, so resolving one moves the
 * review forward through the document and wraps around at the end.
 */
export function nextPendingFrom(
	annotations: Annotation[],
	position: number,
): Annotation | null {
	const pending = orderedPending(annotations);
	const after = pending.find(
		(annotation) =>
			(annotation.range?.from ?? Number.MAX_SAFE_INTEGER) >= position,
	);

	return after ?? pending[0] ?? null;
}

/**
 * Classes for a highlight. The item under review stands out; the rest wait
 * quietly so the text is not a field of colour.
 */
export function highlightClassName(
	annotation: Annotation,
	active: boolean,
): string {
	const classes = ["modai-highlight", `modai-highlight-${annotation.type}`];
	if (annotation.severity === "major") classes.push("modai-highlight-major");
	classes.push(active ? "modai-highlight-active" : "modai-highlight-quiet");

	return classes.join(" ");
}

/** Id of the item to move to, wrapping around the list. */
export function stepAnnotation(
	pending: Annotation[],
	currentId: string | null,
	direction: 1 | -1,
): string | null {
	if (pending.length === 0) return null;

	const index = pending.findIndex(
		(annotation) => annotation.id === currentId,
	);
	const next =
		index === -1
			? direction === 1
				? 0
				: pending.length - 1
			: (index + direction + pending.length) % pending.length;

	return pending[next]?.id ?? null;
}
