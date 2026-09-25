import { Annotation, AnnotationStatus, orderedPending } from "./annotations";

/** A change that was applied to a document, shown in the revision log. */
export interface Revision {
	id: string;
	docPath: string;
	createdAt: number;
	/** Role or instruction that produced the change. */
	role: string;
	summary: string;
	annotationId: string | null;
	before: string;
	after: string;
}

export interface WorkshopState {
	annotations: Annotation[];
	revisions: Revision[];
	/** Review item the sidebar is currently pointing at. */
	activeAnnotationId: string | null;
	/** Role that ran the last pass on a document, so the next chunk can continue it. */
	passes: Record<string, string>;
}

export interface DocumentSummary {
	docPath: string;
	pending: number;
	total: number;
}

const MAX_ANNOTATIONS = 500;
const MAX_REVISIONS = 300;

export function createWorkshop(): WorkshopState {
	return {
		annotations: [],
		revisions: [],
		activeAnnotationId: null,
		passes: {},
	};
}

/** Remembers which role produced the last pass on a document. */
export function setPass(
	state: WorkshopState,
	docPath: string,
	role: string,
): WorkshopState {
	return { ...state, passes: { ...state.passes, [docPath]: role } };
}

/** Role that ran the last pass on a document, if one is remembered. */
export function passRoleFor(
	state: WorkshopState,
	docPath: string,
): string | null {
	return state.passes[docPath] ?? null;
}

/** Keeps the newest `limit` items, dropping old resolved ones first. */
function trimAnnotations(
	annotations: Annotation[],
	limit: number,
): Annotation[] {
	const overflow = annotations.length - limit;
	if (overflow <= 0) return annotations;

	const dropped = new Set<string>();
	const resolved = annotations
		.filter((annotation) => annotation.status !== "pending")
		.sort((a, b) => a.createdAt - b.createdAt);

	for (const annotation of resolved) {
		if (dropped.size >= overflow) break;
		dropped.add(annotation.id);
	}

	return annotations.filter((annotation) => !dropped.has(annotation.id));
}

export function addAnnotations(
	state: WorkshopState,
	added: Annotation[],
	limit = MAX_ANNOTATIONS,
): WorkshopState {
	if (added.length === 0) return state;

	return {
		...state,
		annotations: trimAnnotations([...added, ...state.annotations], limit),
	};
}

export function setAnnotationStatus(
	state: WorkshopState,
	id: string,
	status: AnnotationStatus,
): WorkshopState {
	return {
		...state,
		annotations: state.annotations.map((annotation) =>
			annotation.id === id ? { ...annotation, status } : annotation,
		),
		activeAnnotationId:
			state.activeAnnotationId === id ? null : state.activeAnnotationId,
	};
}

/** Moves a resolved item back to pending and selects it. */
export function reopenAnnotation(
	state: WorkshopState,
	id: string,
): WorkshopState {
	const annotation = state.annotations.find((entry) => entry.id === id);
	if (!annotation || annotation.status === "pending") return state;

	return {
		...state,
		annotations: state.annotations.map((entry) =>
			entry.id === id ? { ...entry, status: "pending" } : entry,
		),
		activeAnnotationId: id,
	};
}

export function setActiveAnnotation(
	state: WorkshopState,
	id: string | null,
): WorkshopState {
	return { ...state, activeAnnotationId: id };
}

export function removeAnnotation(
	state: WorkshopState,
	id: string,
): WorkshopState {
	return {
		...state,
		annotations: state.annotations.filter(
			(annotation) => annotation.id !== id,
		),
		activeAnnotationId:
			state.activeAnnotationId === id ? null : state.activeAnnotationId,
	};
}

/** Drops the applied and rejected items of one document. */
export function clearResolved(
	state: WorkshopState,
	docPath: string,
): WorkshopState {
	const annotations = state.annotations.filter(
		(annotation) =>
			annotation.docPath !== docPath || annotation.status === "pending",
	);

	return {
		...state,
		annotations,
		activeAnnotationId: annotations.some(
			(annotation) => annotation.id === state.activeAnnotationId,
		)
			? state.activeAnnotationId
			: null,
	};
}

export function addRevision(
	state: WorkshopState,
	revision: Revision,
	limit = MAX_REVISIONS,
): WorkshopState {
	return {
		...state,
		revisions: [revision, ...state.revisions].slice(0, limit),
	};
}

export function annotationsFor(
	state: WorkshopState,
	docPath: string,
): Annotation[] {
	return state.annotations.filter(
		(annotation) => annotation.docPath === docPath,
	);
}

export function pendingFor(
	state: WorkshopState,
	docPath: string,
): Annotation[] {
	return orderedPending(annotationsFor(state, docPath));
}

export function revisionsFor(
	state: WorkshopState,
	docPath: string,
): Revision[] {
	return state.revisions.filter((revision) => revision.docPath === docPath);
}

/** Documents that have review items, busiest first. */
export function documents(state: WorkshopState): DocumentSummary[] {
	const summaries = new Map<string, DocumentSummary>();

	for (const annotation of state.annotations) {
		const summary = summaries.get(annotation.docPath) ?? {
			docPath: annotation.docPath,
			pending: 0,
			total: 0,
		};

		summary.total += 1;
		if (annotation.status === "pending") summary.pending += 1;
		summaries.set(annotation.docPath, summary);
	}

	return [...summaries.values()].sort(
		(a, b) => b.pending - a.pending || a.docPath.localeCompare(b.docPath),
	);
}

export interface PersistedData {
	version: number;
	settings: unknown;
	workshop: WorkshopState;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asString(value: unknown, fallback = ""): string {
	return typeof value === "string" ? value : fallback;
}

function asNumber(value: unknown, fallback = 0): number {
	return typeof value === "number" && Number.isFinite(value)
		? value
		: fallback;
}

function asStatus(value: unknown): AnnotationStatus {
	return value === "applied" || value === "rejected" ? value : "pending";
}

function asRange(value: unknown): Annotation["range"] {
	if (!isRecord(value)) return null;

	const from = value.from;
	const to = value.to;
	if (typeof from !== "number" || typeof to !== "number") return null;

	return { from, to };
}

function sanitizeAnnotation(value: unknown): Annotation | null {
	if (!isRecord(value)) return null;

	const id = asString(value.id);
	const docPath = asString(value.docPath);
	if (id === "" || docPath === "") return null;

	return {
		id,
		docPath,
		role: asString(value.role),
		type:
			value.type === "review" || value.type === "feedback"
				? "review"
				: "edit",
		quote: asString(value.quote),
		replacement: asString(value.replacement),
		comment: asString(value.comment),
		range: asRange(value.range),
		status: asStatus(value.status),
		createdAt: asNumber(value.createdAt),
	};
}

function sanitizeRevision(value: unknown): Revision | null {
	if (!isRecord(value)) return null;

	const id = asString(value.id);
	const docPath = asString(value.docPath);
	if (id === "" || docPath === "") return null;

	return {
		id,
		docPath,
		createdAt: asNumber(value.createdAt),
		role: asString(value.role),
		summary: asString(value.summary),
		annotationId:
			typeof value.annotationId === "string" ? value.annotationId : null,
		before: asString(value.before),
		after: asString(value.after),
	};
}

/** Rebuilds a workshop state from stored data, which users can edit by hand. */
export function sanitizeWorkshop(value: unknown): WorkshopState {
	if (!isRecord(value)) return createWorkshop();

	const annotations = Array.isArray(value.annotations)
		? value.annotations
				.map(sanitizeAnnotation)
				.filter((entry): entry is Annotation => entry !== null)
		: [];
	const revisions = Array.isArray(value.revisions)
		? value.revisions
				.map(sanitizeRevision)
				.filter((entry): entry is Revision => entry !== null)
		: [];

	const passes: Record<string, string> = {};
	if (isRecord(value.passes)) {
		for (const [docPath, role] of Object.entries(value.passes)) {
			if (typeof role === "string" && role !== "") passes[docPath] = role;
		}
	}

	return {
		annotations,
		revisions,
		activeAnnotationId:
			typeof value.activeAnnotationId === "string"
				? value.activeAnnotationId
				: null,
		passes,
	};
}

/**
 * Reads the plugin data file. Data written before the workshop existed was the
 * settings object itself, so it is treated as settings with no review items.
 */
export function readPersisted(raw: unknown): PersistedData {
	if (isRecord(raw) && "workshop" in raw) {
		return {
			version: asNumber(raw.version, 1),
			settings: raw.settings,
			workshop: sanitizeWorkshop(raw.workshop),
		};
	}

	return {
		version: 1,
		settings: isRecord(raw) ? raw : {},
		workshop: createWorkshop(),
	};
}
