import { ItemView, WorkspaceLeaf } from "obsidian";
import {
	Annotation,
	currentPending,
	diffFor,
	isStale,
	orderedPending,
} from "./annotations";
import { DiffPart } from "./diff";
import {
	DocumentSummary,
	Revision,
	WorkshopState,
	annotationsFor,
	documents,
	revisionsFor,
} from "./store";

export const WORKSHOP_VIEW_TYPE = "modai-workshop";

/** What the sidebar needs from the plugin. */
export interface WorkshopHost {
	workshopState(): WorkshopState;
	activeDocPath(): string | null;
	/** Text of the open document, used to mark items that no longer match. */
	activeDocText(): string | null;
	openDocument(docPath: string): Promise<void>;
	activateAnnotation(id: string): Promise<void>;
	/** Focus the editor and put the cursor on the item. */
	openInEditor(id: string): Promise<void>;
	stepReview(direction: 1 | -1): Promise<void>;
	applyReview(id: string): Promise<void>;
	rejectReview(id: string): Promise<void>;
	reopenReview(id: string): Promise<void>;
	clearReviewed(docPath: string): Promise<void>;
	/** Names of the roles in settings order. */
	roleNames(): string[];
	/** Runs one pass of a role over the open document. */
	runRole(name: string): Promise<void>;
	/** Models of the selected provider, for the model picker. */
	modelCatalog(): {
		models: string[];
		loading: boolean;
		error: string | null;
		loaded: boolean;
	};
	/** Model id currently in settings. */
	currentModel(): string;
	/** Sets the model in settings. */
	setModel(id: string): Promise<void>;
	/** Reads the model list from the provider again. */
	refreshModels(): Promise<void>;
	/** Whether the last pass of this document can be continued. */
	canContinueReview(docPath: string): boolean;
	/** Runs the last pass again, which picks up where it stopped. */
	continueReview(docPath: string): Promise<void>;
}

/** Panel that walks through the review of the open document. */
export class WorkshopView extends ItemView {
	private host: WorkshopHost;
	private selectedRole: string | null = null;
	private selectedModel: string | null = null;

	constructor(leaf: WorkspaceLeaf, host: WorkshopHost) {
		super(leaf);
		this.host = host;
	}

	getViewType(): string {
		return WORKSHOP_VIEW_TYPE;
	}

	getDisplayText(): string {
		return "Modai workshop";
	}

	getIcon(): string {
		return "paw-print";
	}

	async onOpen(): Promise<void> {
		this.render();
	}

	/** Puts keyboard focus in the panel. */
	focus(): void {
		this.contentEl.focus();
	}

	render(): void {
		const state = this.host.workshopState();
		const docPath = this.host.activeDocPath();
		const annotations =
			docPath === null ? [] : annotationsFor(state, docPath);
		const pending = orderedPending(annotations);
		const summaries = documents(state);
		const activeIndex = pending.findIndex(
			(annotation) => annotation.id === state.activeAnnotationId,
		);

		this.contentEl.empty();
		this.contentEl.addClass("modai-workshop");

		this.renderToolbar(pending.length, activeIndex + 1);
		this.renderRunSection();
		this.renderDocuments(summaries, docPath);
		const activeCard = this.renderReview(
			annotations,
			this.host.activeDocText(),
			state,
		);
		this.renderRevisions(
			docPath === null ? [] : revisionsFor(state, docPath),
		);
		this.renderStatusLine(docPath, pending.length, activeIndex + 1);

		// Keep the item the cursor is on visible without stealing scroll.
		activeCard?.scrollIntoView({ block: "nearest" });
	}

	private async jumpTo(id: string): Promise<void> {
		await this.host.activateAnnotation(id);
	}

	private async stepDocument(direction: 1 | -1): Promise<void> {
		const summaries = documents(this.host.workshopState());
		if (summaries.length === 0) return;

		const docPath = this.host.activeDocPath();
		const index = summaries.findIndex(
			(summary) => summary.docPath === docPath,
		);
		const next =
			index === -1
				? direction === 1
					? 0
					: summaries.length - 1
				: (index + direction + summaries.length) % summaries.length;

		const summary = summaries[next];
		if (summary) await this.host.openDocument(summary.docPath);
	}

	private renderToolbar(pendingCount: number, position: number): void {
		const toolbar = this.contentEl.createDiv({ cls: "modai-toolbar" });

		this.renderTextButton(toolbar, "Previous", () => {
			void this.host.stepReview(-1);
		});
		const positionEl = toolbar.createSpan({
			cls: "modai-position",
			text: pendingCount === 0 ? "–" : `${position}/${pendingCount}`,
		});
		positionEl.setAttribute(
			"aria-label",
			`${pendingCount} pending review item(s)`,
		);
		this.renderTextButton(toolbar, "Next", () => {
			void this.host.stepReview(1);
		});

		const spacer = toolbar.createDiv({ cls: "modai-spacer" });
		spacer.setAttribute("aria-hidden", "true");

		this.renderTextButton(toolbar, "Clear done", () => {
			const docPath = this.host.activeDocPath();
			if (docPath !== null) void this.host.clearReviewed(docPath);
		});
	}

	/** Role + model pickers and a Run button, so passes start here. */
	private renderRunSection(): void {
		const section = this.section("Run");

		const roles = this.host.roleNames();
		if (this.selectedRole === null || !roles.includes(this.selectedRole)) {
			this.selectedRole = roles[0] ?? null;
		}

		if (roles.length === 0) {
			section.createDiv({
				cls: "modai-empty",
				text: "No roles — set a roles folder in settings.",
			});
			return;
		}

		const catalog = this.host.modelCatalog();
		if (!catalog.loaded && !catalog.loading) {
			void this.host.refreshModels().then(() => this.render());
		}

		const current = this.host.currentModel();
		const options =
			catalog.models.length > 0
				? [...new Set([current, ...catalog.models])].filter(
						(id) => id !== "",
					)
				: current !== ""
					? [current]
					: [];
		if (
			this.selectedModel === null ||
			!options.includes(this.selectedModel)
		) {
			this.selectedModel = options[0] ?? null;
		}

		const row = section.createDiv({ cls: "modai-run-row" });
		const roleSelect = row.createEl("select", {
			cls: "modai-select",
			attr: { "aria-label": "Role" },
		});
		for (const name of roles) {
			roleSelect.createEl("option", {
				value: name,
				text: name,
			});
		}
		roleSelect.value = this.selectedRole ?? "";
		roleSelect.addEventListener("change", () => {
			this.selectedRole = roleSelect.value;
		});

		const modelSelect = row.createEl("select", {
			cls: "modai-select",
			attr: { "aria-label": "Model" },
		});
		for (const id of options) {
			modelSelect.createEl("option", { value: id, text: id });
		}
		if (this.selectedModel !== null) modelSelect.value = this.selectedModel;
		modelSelect.addEventListener("change", () => {
			const id = modelSelect.value;
			this.selectedModel = id;
			void this.host.setModel(id).then(() => this.render());
		});

		const actions = section.createDiv({ cls: "modai-actions" });
		this.renderTextButton(actions, "Run", () => {
			if (this.selectedRole !== null)
				void this.host.runRole(this.selectedRole);
		});
		this.renderTextButton(actions, "Refresh models", () => {
			void this.host.refreshModels().then(() => this.render());
		});

		if (catalog.loading) {
			section.createDiv({
				cls: "modai-hint",
				text: "Reading models…",
			});
		} else if (catalog.error !== null) {
			section.createDiv({
				cls: "modai-hint",
				text: catalog.error,
			});
		}
	}

	private renderDocuments(
		summaries: DocumentSummary[],
		docPath: string | null,
	): void {
		const section = this.section("Documents");
		if (summaries.length === 0) {
			section.createDiv({
				cls: "modai-empty",
				text: "Nothing yet — run a role on a note.",
			});
			return;
		}

		for (const summary of summaries) {
			const row = section.createDiv({ cls: "modai-doc" });
			if (summary.docPath === docPath) row.addClass("is-active");

			row.createSpan({
				cls: "modai-doc-name",
				text: basename(summary.docPath),
			});
			row.createSpan({
				cls: "modai-doc-count",
				text: `${summary.pending}/${summary.total}`,
			});
			row.addEventListener("click", () => {
				void this.host.openDocument(summary.docPath);
			});
		}

		if (summaries.length > 1) {
			section.createDiv({
				cls: "modai-hint",
				text: "Click a document to switch.",
			});
		}
	}

	/**
	 * The review: one item at a time. The current one is the only expanded card,
	 * the rest wait in a compact queue below it, and what was resolved moves to
	 * the end of the list.
	 */
	private renderReview(
		annotations: Annotation[],
		docText: string | null,
		state: WorkshopState,
	): HTMLElement | null {
		const section = this.section("Review");
		if (annotations.length === 0) {
			section.createDiv({
				cls: "modai-empty",
				text:
					docText === null
						? "Open a note to see its review items."
						: "Nothing to review here. Run a role to start a pass.",
			});
			return null;
		}

		const pending = orderedPending(annotations);
		const current = currentPending(annotations, state.activeAnnotationId);
		const resolved = annotations
			.filter((annotation) => annotation.status !== "pending")
			.sort((a, b) => b.createdAt - a.createdAt);

		let activeCard: HTMLElement | null = null;
		if (current) {
			activeCard = this.renderReviewCard(
				section,
				current,
				docText,
				state,
				true,
			);
		} else {
			this.renderChunkPrompt(section, state);
		}

		const queued = pending.filter(
			(annotation) => annotation.id !== current?.id,
		);
		if (queued.length > 0) {
			this.renderQueue(section, queued, pending, state);
		}
		if (resolved.length > 0) {
			this.renderResolved(section, resolved, pending, state);
		}

		return activeCard;
	}

	/** Compact rows for the items that are still waiting. */
	private renderQueue(
		parent: HTMLElement,
		queued: Annotation[],
		pending: Annotation[],
		state: WorkshopState,
	): void {
		const queue = parent.createDiv({ cls: "modai-queue" });
		queue.createDiv({ cls: "modai-queue-heading", text: "Up next" });

		for (const annotation of queued) {
			const position = pending.findIndex(
				(entry) => entry.id === annotation.id,
			);
			const row = queue.createDiv({ cls: "modai-queue-row" });
			row.createSpan({
				cls: "modai-queue-index",
				text: `${position + 1}.`,
			});
			row.createSpan({
				cls: "modai-queue-text",
				text: snippetOf(annotation),
			});
			if (annotation.type === "review") {
				row.createSpan({ cls: "modai-tag", text: "review" });
			}
			row.addEventListener("click", () => {
				void this.jumpTo(annotation.id);
			});
		}

		if (pending.length > 1) {
			queue.createDiv({
				cls: "modai-hint",
				text: "Click an item to review it.",
			});
		}
	}

	/**
	 * Shown when nothing is waiting: a pass can be continued, which asks the
	 * provider for the next chunk instead of repeating what was handled.
	 */
	private renderChunkPrompt(parent: HTMLElement, state: WorkshopState): void {
		const docPath = this.host.activeDocPath();
		if (docPath === null || !this.host.canContinueReview(docPath)) {
			parent.createDiv({
				cls: "modai-empty",
				text: "Everything is reviewed. Applied changes are in Revisions.",
			});
			return;
		}

		const prompt = parent.createDiv({ cls: "modai-chunk-prompt" });
		prompt.createDiv({
			cls: "modai-empty",
			text: "That is the whole chunk. The next one carries on from here.",
		});
		this.renderTextButton(prompt, "Get the next chunk", () => {
			void this.host.continueReview(docPath);
		});
	}

	/** One line each for what was applied or rejected. */
	private renderResolved(
		parent: HTMLElement,
		resolved: Annotation[],
		pending: Annotation[],
		state: WorkshopState,
	): void {
		const done = parent.createDiv({ cls: "modai-queue modai-queue-done" });
		done.createDiv({
			cls: "modai-queue-heading",
			text: `Reviewed (${resolved.length})`,
		});

		for (const annotation of resolved) {
			const row = done.createDiv({ cls: "modai-queue-row is-done" });
			row.createSpan({
				cls: "modai-queue-index",
				text: annotation.status === "applied" ? "✓" : "✗",
			});
			row.createSpan({
				cls: "modai-queue-text",
				text: snippetOf(annotation),
			});
			if (annotation.id === state.activeAnnotationId) {
				row.addClass("is-active");
			}
			this.renderTextButton(row, "Reopen", () => {
				void this.host.reopenReview(annotation.id);
			});
			if (pending.length === 0) {
				row.addEventListener("click", () => {
					void this.jumpTo(annotation.id);
				});
			}
		}
	}

	private renderReviewCard(
		parent: HTMLElement,
		annotation: Annotation,
		docText: string | null,
		state: WorkshopState,
		pending: boolean,
	): HTMLElement {
		const isActive = annotation.id === state.activeAnnotationId;
		const card = parent.createDiv({
			cls: `modai-card modai-card-${annotation.type}`,
		});
		if (isActive) card.addClass("is-active");
		if (!pending) card.addClass("is-done");

		const meta = card.createDiv({ cls: "modai-card-meta" });
		meta.createSpan({ cls: "modai-role", text: annotation.role });
		meta.createSpan({ cls: "modai-tag", text: annotation.type });
		if (!pending) {
			meta.createSpan({ cls: "modai-tag", text: annotation.status });
		}
		if (docText !== null && isStale(docText, annotation)) {
			meta.createSpan({
				cls: "modai-tag is-stale",
				text: "text changed",
			});
		}

		if (annotation.comment !== "") {
			card.createDiv({ cls: "modai-comment", text: annotation.comment });
		}

		if (annotation.replacement !== "") {
			this.renderDiff(
				card.createDiv({ cls: "modai-diff" }),
				diffFor(annotation),
			);
		} else if (annotation.quote !== "") {
			// A review note: it points at the text instead of changing it.
			card.createDiv({ cls: "modai-quote", text: annotation.quote });
		}

		const actions = card.createDiv({ cls: "modai-actions" });

		if (pending) {
			if (annotation.replacement !== "") {
				this.renderTextButton(actions, "Apply", () => {
					void this.host.applyReview(annotation.id);
				});
			}
			this.renderTextButton(actions, "Reject", () => {
				void this.host.rejectReview(annotation.id);
			});
		}

		this.renderTextButton(actions, "Open in editor", () => {
			void this.host.openInEditor(annotation.id);
		});

		card.addEventListener("click", () => {
			void this.jumpTo(annotation.id);
		});

		return card;
	}

	private renderRevisions(revisions: Revision[]): void {
		const section = this.section("Revisions");
		if (revisions.length === 0) {
			section.createDiv({
				cls: "modai-empty",
				text: "Applied changes are tracked here.",
			});
			return;
		}

		for (const revision of revisions) {
			const row = section.createDiv({ cls: "modai-revision" });

			const meta = row.createDiv({ cls: "modai-card-meta" });
			meta.createSpan({
				text: new Date(revision.createdAt).toLocaleString(),
			});
			if (revision.role !== "") {
				meta.createSpan({ cls: "modai-tag", text: revision.role });
			}

			row.createDiv({ cls: "modai-comment", text: revision.summary });
			this.renderDiff(row.createDiv({ cls: "modai-diff" }), [
				{ value: revision.before, kind: "removed" },
				{ value: revision.after, kind: "added" },
			]);
		}
	}

	private renderStatusLine(
		docPath: string | null,
		pendingCount: number,
		position: number,
	): void {
		const bar = this.contentEl.createDiv({ cls: "modai-statusline" });
		bar.createSpan({ cls: "modai-mode", text: "MODAI" });
		bar.createSpan({
			cls: "modai-status",
			text:
				docPath === null
					? "no document"
					: `${basename(docPath)} — ${
							pendingCount === 0
								? "0 pending"
								: `${position}/${pendingCount} pending`
						}`,
		});
	}

	private renderDiff(parent: HTMLElement, parts: DiffPart[]): void {
		for (const part of parts) {
			parent.createSpan({
				cls: `modai-diff-${part.kind}`,
				text: part.value,
			});
		}
	}

	private renderTextButton(
		parent: HTMLElement,
		label: string,
		onClick: () => void,
	): void {
		const button = parent.createEl("button", {
			cls: "modai-text-button",
			text: label,
			title: label,
		});
		button.addEventListener("click", (event) => {
			event.stopPropagation();
			onClick();
		});
	}

	private section(title: string): HTMLElement {
		const section = this.contentEl.createDiv({ cls: "modai-section" });
		section.createEl("h4", { text: title });

		return section;
	}
}

/** One line that identifies an item: what it quotes, or what it says. */
function snippetOf(annotation: Annotation): string {
	const text = (annotation.quote || annotation.comment)
		.replace(/\s+/g, " ")
		.trim();
	const limit = 80;

	return text.length > limit ? `${text.slice(0, limit - 1)}…` : text;
}

function basename(path: string): string {
	const name = path.slice(path.lastIndexOf("/") + 1);

	return name.replace(/\.md$/i, "");
}
