import { Editor, MarkdownView, Notice, Plugin, TFile } from "obsidian";
import type { EditorView } from "@codemirror/view";
import { ModaiSettingsTab, PluginSettings, resolveSettings } from "./settings";
import {
	CustomInstructionsModal,
	ModaiResult,
} from "modals/customInstructionsModal";
import { createProvider } from "providers/factory";
import { fetchModels } from "providers/models";
import { buildPrompt } from "prompt";
import { Role, isInRolesFolder, loadRoles, roleCommandId } from "roles";
import {
	Annotation,
	locateRange,
	nextPendingFrom,
	stepAnnotation,
} from "workshop/annotations";
import { splitIntoHunks } from "workshop/diff";
import {
	anchorQuote,
	buildPassPrompt,
	parsePassResponse,
} from "workshop/prompt";
import {
	WorkshopState,
	addAnnotations,
	addRevision,
	annotationsFor,
	clearResolved,
	createWorkshop,
	passRoleFor,
	pendingFor,
	readPersisted,
	setPass,
	setActiveAnnotation,
	setAnnotationStatus,
	reopenAnnotation,
} from "workshop/store";
import { annotationHighlighter, cursorFollower } from "workshop/highlight";
import { WORKSHOP_VIEW_TYPE, WorkshopHost, WorkshopView } from "workshop/view";

/** Obsidian's Editor exposes its CodeMirror 6 view as `cm`. */
type EditorWithCodeMirror = Editor & { cm?: EditorView };

export default class Modai extends Plugin implements WorkshopHost {
	settings: PluginSettings;
	statusBarSpan: HTMLSpanElement;
	/** Roles read from the folder configured in the settings. */
	roles: Role[] = [];

	/** Models the provider reported, keyed by the settings they came from. */
	private models: string[] = [];
	private modelsError: string | null = null;
	private modelsLoading = false;
	private modelsKey = "";

	private workshop: WorkshopState = createWorkshop();
	/** Bumped on every workshop change so open editors redraw their highlights. */
	private version = 0;

	/** Command ids registered for roles, so they can be replaced on refresh. */
	private roleCommandIds = new Set<string>();
	private refreshTimer: number | null = null;

	async onload() {
		await this.loadSettings();

		const item = this.addStatusBarItem();
		this.statusBarSpan = item.createSpan({
			text: this.settings.model,
		});

		this.addSettingTab(new ModaiSettingsTab(this.app, this));
		this.registerView(
			WORKSHOP_VIEW_TYPE,
			(leaf) => new WorkshopView(leaf, this),
		);
		this.registerEditorExtension([
			annotationHighlighter(this),
			cursorFollower(this),
		]);

		await this.refreshRoles();

		this.addRibbonIcon("paw-print", "Modai: custom instructions", () =>
			this.customInstructions(),
		);

		this.addCommand({
			id: `modai-custom`,
			name: `Use custom instructions`,
			callback: () => this.customInstructions(),
		});
		this.addCommand({
			id: "review-next-chunk",
			name: "Get next review chunk",
			callback: () => {
				void this.continueActiveReview();
			},
		});
		this.addCommand({
			id: "workshop-open",
			name: "Open workshop panel",
			callback: () => {
				void this.activateWorkshopView();
			},
		});
		// The ids below are the released ones; renaming them would drop the
		// hotkeys people have bound, so they keep the older wording.
		this.addCommand({
			id: "suggestion-next",
			name: "Next review item",
			callback: () => {
				void this.stepReview(1);
			},
		});
		this.addCommand({
			id: "suggestion-previous",
			name: "Previous review item",
			callback: () => {
				void this.stepReview(-1);
			},
		});
		this.addCommand({
			id: "suggestion-apply",
			name: "Apply current review item",
			callback: () => {
				void this.applyActiveReview();
			},
		});
		this.addCommand({
			id: "suggestion-reject",
			name: "Reject current review item",
			callback: () => {
				void this.rejectActiveReview();
			},
		});

		// Roles live in the vault, so the commands have to follow the folder.
		this.registerEvent(
			this.app.vault.on("create", (file) =>
				this.onVaultChange(file.path),
			),
		);
		this.registerEvent(
			this.app.vault.on("modify", (file) =>
				this.onVaultChange(file.path),
			),
		);
		this.registerEvent(
			this.app.vault.on("delete", (file) =>
				this.onVaultChange(file.path),
			),
		);
		this.registerEvent(
			this.app.vault.on("rename", (file, oldPath) => {
				this.onVaultChange(file.path);
				this.onVaultChange(oldPath);
			}),
		);
		this.registerEvent(
			this.app.workspace.on("file-open", () => this.refreshWorkshop()),
		);
	}

	onunload() {
		if (this.refreshTimer !== null) {
			window.clearTimeout(this.refreshTimer);
		}
	}

	// WorkshopHost

	workshopState(): WorkshopState {
		return this.workshop;
	}

	activeDocPath(): string | null {
		return this.activeFile()?.path ?? null;
	}

	activeDocText(): string | null {
		return this.activeView()?.editor.getValue() ?? null;
	}

	annotationVersion(): number {
		return this.version;
	}

	annotationsForDoc(docPath: string): Annotation[] {
		return annotationsFor(this.workshop, docPath);
	}

	activeAnnotationId(): string | null {
		return this.workshop.activeAnnotationId;
	}

	/**
	 * Opens the pending item under the cursor. In-memory only: no persist,
	 * so caret moves never touch the disk. The next commit saves the choice.
	 */
	followCursor(docPath: string, offset: number, text: string): void {
		const hits = pendingFor(this.workshop, docPath)
			.map((annotation) => ({
				annotation,
				range: locateRange(text, annotation),
			}))
			.filter(
				(entry) =>
					entry.range !== null &&
					offset >= entry.range.from &&
					offset <= entry.range.to,
			)
			.sort((a, b) => (a.range?.from ?? 0) - (b.range?.from ?? 0));

		const hit = hits[0]?.annotation;
		if (!hit || hit.id === this.workshop.activeAnnotationId) return;

		this.workshop = setActiveAnnotation(this.workshop, hit.id);
		this.refreshWorkshop();
		this.refreshHighlights();
	}

	async openDocument(docPath: string): Promise<void> {
		if (this.activeFile()?.path === docPath) return;

		await this.app.workspace.openLinkText(docPath, "", false);
		this.refreshWorkshop();
	}

	async activateAnnotation(id: string): Promise<void> {
		const annotation = this.findAnnotation(id);
		if (!annotation) return;

		await this.openDocument(annotation.docPath);

		const editor = this.activeView()?.editor;
		if (editor) this.selectRange(editor, annotation);
		else if (annotation.docPath !== this.activeFile()?.path) {
			new Notice("Modai: open the document to see this review item.");
		}

		this.workshop = setActiveAnnotation(this.workshop, id);
		this.refreshWorkshop();
		this.refreshHighlights();
	}

	async stepReview(
		direction: 1 | -1,
		docPath: string | null = null,
	): Promise<void> {
		const path = docPath ?? this.activeDocPath();
		if (path === null) return;

		const pending = pendingFor(this.workshop, path);
		if (pending.length === 0) {
			new Notice("Modai: this document has no pending review items.");
			return;
		}

		const next = stepAnnotation(
			pending,
			this.workshop.activeAnnotationId,
			direction,
		);
		if (next) await this.activateAnnotation(next);
	}

	/**
	 * Turns an answer into a review item that points at the text it is about:
	 * the selection, or the first line when the whole note was the target.
	 */
	private reviewFromAnswer(
		docPath: string,
		target: TextTarget,
		answer: string,
	): Annotation {
		const annotation: Annotation = {
			id: this.newId("annotation"),
			docPath,
			role: "Custom instruction",
			type: "review",
			quote: target.hasSelection ? target.text : anchorQuote(target.text),
			replacement: "",
			comment: answer.trim(),
			range: null,
			status: "pending",
			createdAt: Date.now(),
		};

		const local = locateRange(target.text, annotation);
		annotation.range = local
			? {
					from: local.from + target.fromOffset,
					to: local.to + target.fromOffset,
				}
			: null;

		return annotation;
	}

	async applyReview(id: string): Promise<void> {
		const annotation = this.findAnnotation(id);
		if (!annotation || annotation.status !== "pending") return;

		const editor = await this.editorFor(annotation.docPath);
		if (!editor) {
			new Notice(
				"Modai: open the document before applying a review item.",
			);
			return;
		}

		const range = locateRange(editor.getValue(), annotation);
		if (!range) {
			new Notice("Modai: the quoted text is no longer in the document.");
			return;
		}

		editor.replaceRange(
			annotation.replacement,
			editor.offsetToPos(range.from),
			editor.offsetToPos(range.to),
		);
		editor.setCursor(editor.offsetToPos(range.from));

		this.workshop = setAnnotationStatus(this.workshop, id, "applied");
		this.workshop = addRevision(this.workshop, {
			id: this.newId("revision"),
			docPath: annotation.docPath,
			createdAt: Date.now(),
			role: annotation.role,
			summary: `Applied ${annotation.type} review item`,
			annotationId: annotation.id,
			before: annotation.quote,
			after: annotation.replacement,
		});

		await this.commit();
		await this.advanceReview(annotation);
	}

	async rejectReview(id: string): Promise<void> {
		const annotation = this.findAnnotation(id);
		if (!annotation || annotation.status !== "pending") return;

		this.workshop = setAnnotationStatus(this.workshop, id, "rejected");
		await this.commit();
		await this.advanceReview(annotation);
	}

	/**
	 * Brings up the next open item in the document, so reviewing is a
	 * sequence of decisions instead of a list to work through by hand.
	 */
	private async advanceReview(annotation: Annotation): Promise<void> {
		const next = nextPendingFrom(
			pendingFor(this.workshop, annotation.docPath),
			annotation.range?.to ?? 0,
		);
		if (!next) {
			this.workshop = setActiveAnnotation(this.workshop, null);
			this.refreshWorkshop();
			this.refreshHighlights();
			return;
		}

		await this.activateAnnotation(next.id);
	}

	async reopenReview(id: string): Promise<void> {
		const annotation = this.findAnnotation(id);
		if (!annotation || annotation.status === "pending") return;

		this.workshop = reopenAnnotation(this.workshop, id);
		await this.commit();
		await this.activateAnnotation(id);
	}

	async clearReviewed(docPath: string): Promise<void> {
		this.workshop = clearResolved(this.workshop, docPath);
		await this.commit();
	}

	// Models

	/**
	 * Models the current provider offers. `loaded` says whether they were read
	 * for the settings in use, so the settings can fetch once and show why they
	 * are missing when the provider does not answer.
	 */
	modelCatalog(): {
		models: string[];
		loading: boolean;
		error: string | null;
		loaded: boolean;
	} {
		const loaded = this.modelsKey === this.modelsKeyFor(this.settings);

		return {
			models: loaded ? this.models : [],
			error: loaded ? this.modelsError : null,
			loading: this.modelsLoading,
			loaded,
		};
	}

	/** Reads the model list of the selected provider. */
	async refreshModels(): Promise<void> {
		if (this.modelsLoading) return;

		const key = this.modelsKeyFor(this.settings);
		this.modelsLoading = true;
		this.modelsError = null;

		try {
			const result = await fetchModels({
				provider: this.settings.provider,
				apiKey: this.settings.apiKey,
				baseUrl: this.settings.baseUrl,
			});

			// The settings may have changed while the request was in flight.
			if (key !== this.modelsKeyFor(this.settings)) return;

			this.modelsKey = key;
			this.models = result.models;
			this.modelsError = result.error;
		} finally {
			this.modelsLoading = false;
		}
	}

	private modelsKeyFor(settings: PluginSettings): string {
		return `${settings.provider}|${settings.baseUrl}|${settings.apiKey}`;
	}

	// Workshop passes

	/**
	 * Runs one chunk of a role over the open document. Running it again carries
	 * on: the items already in the panel are handed to the model as covered.
	 */
	async runPass(role: Role): Promise<void> {
		const view = this.activeView();
		const file = view?.file;
		if (!view || !file) {
			new Notice("Modai: open a note first.");
			return;
		}

		const text = view.editor.getValue();
		if (!text.trim()) {
			new Notice("Document is empty.");
			return;
		}

		const reviewed = annotationsFor(this.workshop, file.path)
			.map((annotation) => annotation.quote)
			.filter((quote) => quote !== "");
		const status = new Notice(`Modai: ${role.name} is reading...`, 0);

		try {
			const raw = await this.callModel(
				buildPassPrompt(role, text, {
					chunkSize: this.settings.chunkSize,
					alreadyReviewed: reviewed,
				}),
			);
			const result = parsePassResponse(raw, {
				docPath: file.path,
				docText: text,
				role,
				idFactory: () => this.newId("annotation"),
			});

			// The provider may repeat something that is already in the panel.
			const covered = new Set(reviewed);
			const fresh = result.annotations.filter(
				(annotation) => !covered.has(annotation.quote),
			);

			if (fresh.length === 0) {
				new Notice(
					result.skipped > 0
						? `Modai: ${result.skipped} item(s) could not be matched to the text.`
						: "Modai: nothing new to review.",
				);
				return;
			}

			this.workshop = addAnnotations(this.workshop, fresh);
			this.workshop = setPass(this.workshop, file.path, role.name);
			this.workshop = setActiveAnnotation(
				this.workshop,
				fresh[0]?.id ?? null,
			);
			await this.commit();
			await this.activateWorkshopView();

			const unmatched =
				result.skipped > 0 ? `, ${result.skipped} unmatched` : "";
			new Notice(
				`Modai: ${fresh.length} review item(s) ready${unmatched}.`,
			);
		} catch (error) {
			console.error("Modai Error:", error);
			new Notice("Modai: error processing text.");
		} finally {
			status.hide();
		}
	}

	/** Runs the last pass of the open document again, for the next chunk. */
	private async continueActiveReview(): Promise<void> {
		const docPath = this.activeDocPath();
		if (docPath === null) {
			new Notice("Modai: open a note first.");
			return;
		}
		if (!this.canContinueReview(docPath)) {
			new Notice("Modai: run a role on this note first.");
			return;
		}

		await this.continueReview(docPath);
	}

	/** Whether the last pass of this document can be continued. */
	canContinueReview(docPath: string): boolean {
		return this.roleForPass(docPath) !== null;
	}

	/** Runs the last pass of a document again, which continues where it stopped. */
	async continueReview(docPath: string): Promise<void> {
		const role = this.roleForPass(docPath);
		if (!role) return;

		await this.openDocument(docPath);
		await this.runPass(role);
	}

	private roleForPass(docPath: string): Role | null {
		const name = passRoleFor(this.workshop, docPath);

		return this.roles.find((entry) => entry.name === name) ?? null;
	}

	/** Role names in settings order, for the sidebar picker. */
	roleNames(): string[] {
		return this.roles.map((role) => role.name);
	}

	/** Runs one pass of a role picked in the sidebar. */
	async runRole(name: string): Promise<void> {
		const role = this.roles.find((entry) => entry.name === name);
		if (!role) {
			new Notice("Modai: role not found.");
			return;
		}

		await this.runPass(role);
	}

	/** Model id currently in settings, for the sidebar picker. */
	currentModel(): string {
		return this.settings.model;
	}

	/** Sets the model from the sidebar picker. */
	async setModel(id: string): Promise<void> {
		this.settings.model = id;
		await this.saveSettings();
	}

	customInstructions() {
		const target = this.currentText();
		if (!target) return;

		if (!target.text.trim()) {
			new Notice("Document is empty.");
			return;
		}

		new CustomInstructionsModal(
			this.app,
			(result: ModaiResult) => {
				if (!result.instructions.trim()) return;

				this.runInstruction(result, target).catch((error) => {
					console.error("Modai Error:", error);
					new Notice("Modai: error processing text.");
				});
			},
			this.roles,
		).open();
	}

	/** Ad-hoc instructions: rewrite text for "replace", review items for "review". */
	private async runInstruction(
		result: ModaiResult,
		target: TextTarget,
	): Promise<void> {
		const file = this.activeView()?.file;
		if (!file) return;

		const status = new Notice(
			`Modai: ${this.settings.model} thinking...`,
			0,
		);

		try {
			const response = await this.queryProvider(
				result.instructions,
				target.text,
			);

			if (result.type === "review") {
				this.workshop = addAnnotations(this.workshop, [
					this.reviewFromAnswer(file.path, target, response),
				]);
				await this.commit();
				await this.activateWorkshopView();
				return;
			}

			const snippets = target.hasSelection
				? [{ quote: target.text, replacement: response }]
				: splitIntoHunks(target.text, response);

			if (snippets.length === 0) {
				new Notice("Modai: nothing to change.");
				return;
			}

			const annotations = snippets.map((snippet): Annotation => {
				const annotation: Annotation = {
					id: this.newId("annotation"),
					docPath: file.path,
					role: "Custom instruction",
					type: "edit",
					quote: snippet.quote,
					replacement: snippet.replacement,
					comment: "",
					range: null,
					status: "pending",
					createdAt: Date.now(),
				};

				// `snippets` are offsets inside the targeted text, which starts at
				// `fromOffset` in the document.
				const local = locateRange(target.text, annotation);
				annotation.range = local
					? {
							from: local.from + target.fromOffset,
							to: local.to + target.fromOffset,
						}
					: null;

				return annotation;
			});

			this.workshop = addAnnotations(this.workshop, annotations);
			this.workshop = setActiveAnnotation(
				this.workshop,
				annotations[0]?.id ?? null,
			);
			await this.commit();
			await this.activateWorkshopView();
		} catch (error) {
			console.error("Modai Error:", error);
			new Notice("Modai: error processing text.");
		} finally {
			status.hide();
		}
	}

	private async applyActiveReview(): Promise<void> {
		const id = this.workshop.activeAnnotationId;
		if (!id) {
			new Notice("Modai: no review item selected.");
			return;
		}

		await this.applyReview(id);
	}

	private async rejectActiveReview(): Promise<void> {
		const id = this.workshop.activeAnnotationId;
		if (!id) {
			new Notice("Modai: no review item selected.");
			return;
		}

		await this.rejectReview(id);
	}

	// Model access

	async queryProvider(instructions: string, text: string): Promise<string> {
		return await this.callModel(buildPrompt(instructions, text));
	}

	async callModel(prompt: string): Promise<string> {
		if (!this.settings.model.trim()) {
			throw new Error(
				"No model configured. Set one in Modai's settings.",
			);
		}

		const selectedProvider = createProvider(this.settings);

		return await selectedProvider.call(
			prompt,
			this.settings.model,
			this.settings.temperature,
		);
	}

	// Roles

	/** Loads the role files and registers one command per role. */
	async refreshRoles() {
		this.roles = await loadRoles(this.app.vault, this.settings.rolesFolder);

		const ids = new Set(this.roles.map((role) => roleCommandId(role.name)));

		for (const id of this.roleCommandIds) {
			if (!ids.has(id)) this.removeRoleCommand(id);
		}

		for (const role of this.roles) {
			const id = roleCommandId(role.name);
			if (this.roleCommandIds.has(id)) continue;

			this.addCommand({
				id,
				name: `use ${role.name}`,
				callback: () => {
					// Look the role up again: its file may have changed since the
					// command was registered.
					const current =
						this.roles.find((entry) => entry.name === role.name) ??
						role;
					void this.runPass(current);
				},
			});
			this.roleCommandIds.add(id);
		}
	}

	/** Drops the command of a role that no longer has a file. */
	private removeRoleCommand(id: string): void {
		this.removeCommand(id);
		this.roleCommandIds.delete(id);
	}

	private onVaultChange(path: string): void {
		if (!path.toLowerCase().endsWith(".md")) return;
		if (!isInRolesFolder(path, this.settings.rolesFolder)) return;

		this.scheduleRoleRefresh();
	}

	/** Coalesces the burst of events a sync or a rename produces. */
	private scheduleRoleRefresh(): void {
		if (this.refreshTimer !== null) {
			window.clearTimeout(this.refreshTimer);
		}

		this.refreshTimer = window.setTimeout(() => {
			this.refreshTimer = null;
			this.refreshRoles().catch((error) => {
				console.error("Modai: failed to load roles", error);
			});
		}, 250);
	}

	// Workshop plumbing

	private findAnnotation(id: string): Annotation | undefined {
		return this.workshop.annotations.find(
			(annotation) => annotation.id === id,
		);
	}

	private activeView(): MarkdownView | null {
		return this.app.workspace.getActiveViewOfType(MarkdownView);
	}

	private activeFile(): TFile | null {
		return this.activeView()?.file ?? null;
	}

	/** The editor of `docPath`, opening the document when needed. */
	private async editorFor(docPath: string): Promise<Editor | null> {
		await this.openDocument(docPath);

		return this.activeFile()?.path === docPath
			? (this.activeView()?.editor ?? null)
			: null;
	}

	private selectRange(editor: Editor, annotation: Annotation): void {
		const range = locateRange(editor.getValue(), annotation);
		if (!range) return;

		const from = editor.offsetToPos(range.from);
		const to = editor.offsetToPos(range.to);
		editor.setSelection(from, to);
		editor.scrollIntoView({ from, to }, true);
	}

	/** Text of the selection, or of the whole note. */
	private currentText(): TextTarget | null {
		const activeView = this.activeView();
		if (!activeView) return null;

		const editor = activeView.editor;
		const from = editor.getCursor("from");
		const to = editor.getCursor("to");
		const selection = editor.getSelection();
		const hasSelection = selection.trim().length > 0;
		const docText = editor.getValue();

		return {
			editor,
			text: hasSelection ? selection : docText,
			hasSelection,
			fromOffset: hasSelection ? editor.posToOffset(from) : 0,
			toOffset: hasSelection ? editor.posToOffset(to) : docText.length,
		};
	}

	async activateWorkshopView(): Promise<void> {
		const existing =
			this.app.workspace.getLeavesOfType(WORKSHOP_VIEW_TYPE)[0];
		if (existing) {
			await this.app.workspace.revealLeaf(existing);
			this.refreshWorkshop();
			return;
		}

		const leaf = this.app.workspace.getRightLeaf(false);
		if (!leaf) return;

		await leaf.setViewState({ type: WORKSHOP_VIEW_TYPE, active: true });
		await this.app.workspace.revealLeaf(leaf);
		this.refreshWorkshop();
		this.focusWorkshop();
	}

	/** Puts the keyboard in the panel, so its keys work right away. */
	focusWorkshop(): void {
		for (const leaf of this.app.workspace.getLeavesOfType(
			WORKSHOP_VIEW_TYPE,
		)) {
			const view = leaf.view;
			if (view instanceof WorkshopView) view.focus();
		}
	}

	refreshWorkshop(): void {
		for (const leaf of this.app.workspace.getLeavesOfType(
			WORKSHOP_VIEW_TYPE,
		)) {
			const view = leaf.view;
			if (view instanceof WorkshopView) view.render();
		}
	}

	/** Redraws the highlights of the open document. */
	refreshHighlights(): void {
		this.version += 1;

		const editor = this.activeView()?.editor;
		const cm = editor ? (editor as EditorWithCodeMirror).cm : undefined;
		cm?.dispatch({});
	}

	/** Persists the workshop and refreshes every surface that shows it. */
	private async commit(): Promise<void> {
		await this.persist();
		this.refreshWorkshop();
		this.refreshHighlights();
	}

	private newId(prefix: string): string {
		return `${prefix}-${Date.now().toString(36)}-${Math.random()
			.toString(36)
			.slice(2, 8)}`;
	}

	// Settings and data

	async loadSettings() {
		const data = readPersisted(await this.loadData());

		this.settings = resolveSettings(
			data.settings as Partial<PluginSettings> | null,
		);
		this.workshop = data.workshop;
		this.version += 1;
	}

	async saveSettings() {
		await this.persist();
		this.statusBarSpan.setText(this.settings.model);
	}

	private async persist(): Promise<void> {
		await this.saveData({
			version: 1,
			settings: this.settings,
			workshop: this.workshop,
		});
	}
}

interface TextTarget {
	editor: Editor;
	text: string;
	hasSelection: boolean;
	fromOffset: number;
	toOffset: number;
}
