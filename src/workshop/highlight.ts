import type { Annotation } from "./annotations";
import {
	Decoration,
	DecorationSet,
	EditorView,
	ViewPlugin,
} from "@codemirror/view";
import type { Extension } from "@codemirror/state";
import type { ViewUpdate } from "@codemirror/view";
import { editorInfoField } from "obsidian";
import { highlightClassName, locateRange } from "./annotations";

/** Where the editor extension reads the review items it highlights. */
export interface HighlightHost {
	/** Review items of the document, in any order. */
	annotationsForDoc(docPath: string): Annotation[];
	activeAnnotationId(): string | null;
	/** Bumped whenever the review items change, to trigger a redraw. */
	annotationVersion(): number;
	/** Opens the pending item under the cursor, if it is not open yet. */
	followCursor(docPath: string, offset: number, text: string): void;
}

/** Document path of the editor the extension is running in, if any. */
function docPathOf(view: EditorView): string | null {
	const info = view.state.field(editorInfoField, false);

	return info?.file?.path ?? null;
}

function buildDecorations(
	view: EditorView,
	host: HighlightHost,
): DecorationSet {
	const docPath = docPathOf(view);
	if (docPath === null) return Decoration.none;

	const text = view.state.doc.toString();
	if (text.length > 1_000_000) return Decoration.none;

	const active = host.activeAnnotationId();
	const ranges = host
		.annotationsForDoc(docPath)
		.filter((annotation) => annotation.status === "pending")
		.map((annotation) => ({
			annotation,
			range: locateRange(text, annotation),
		}))
		.filter((entry) => entry.range !== null)
		.sort((a, b) => (a.range?.from ?? 0) - (b.range?.from ?? 0))
		.map(({ annotation, range }) =>
			Decoration.mark({
				class: highlightClassName(annotation, annotation.id === active),
			}).range(range?.from ?? 0, range?.to ?? 0),
		);

	return Decoration.set(ranges, true);
}

/**
 * Opens the review item under the cursor: a caret move selects the pending
 * item whose text holds the cursor, so the sidebar follows the editor. Range
 * selections are ignored, and activating never moves the cursor itself.
 */
export function cursorFollower(host: HighlightHost): Extension {
	return EditorView.updateListener.of((update) => {
		if (!update.selectionSet) return;

		const main = update.state.selection.main;
		if (!main.empty) return;

		const docPath = docPathOf(update.view);
		if (docPath === null) return;

		host.followCursor(docPath, main.head, update.state.doc.toString());
	});
}

/**
 * Highlights the review items of the open document. Positions are recomputed
 * from the quoted text on every change, so highlights follow edits and vanish
 * when their text is gone.
 */
export function annotationHighlighter(host: HighlightHost) {
	return ViewPlugin.fromClass(
		class {
			decorations: DecorationSet;
			private version: number;

			constructor(view: EditorView) {
				this.version = -1;
				this.decorations = this.build(view);
			}

			update(update: ViewUpdate) {
				if (
					!update.docChanged &&
					!update.viewportChanged &&
					host.annotationVersion() === this.version
				) {
					return;
				}

				this.decorations = this.build(update.view);
			}

			private build(view: EditorView): DecorationSet {
				this.version = host.annotationVersion();

				return buildDecorations(view, host);
			}
		},
		{ decorations: (plugin) => plugin.decorations },
	);
}
