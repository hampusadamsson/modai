import { MarkdownView, Notice, Plugin } from "obsidian";
import { DEFAULT_SETTINGS, ModaiSettingsTab, PluginSettings } from "./settings";
import { CustomInstructionsModal } from "customInstructionsModal";
import { provider } from "providers/base";
import { Gemini } from "providers/gemini";
import { ChatGPT } from "providers/chatgpt";
import { DiffModal } from "diffmodal";

export default class Modai extends Plugin {
	settings: PluginSettings;
	statusBarSpan: HTMLSpanElement;

	async onload() {
		await this.loadSettings();

		const item = this.addStatusBarItem();
		this.statusBarSpan = item.createEl("span", {
			text: this.settings.model,
		});

		this.addSettingTab(new ModaiSettingsTab(this.app, this));
		for (const [role, instructions] of Object.entries(
			this.settings.roles,
		)) {
			this.addCommand({
				id: `modai-${role}`,
				name: `use ${role}`,
				callback: async () => {
					const activeView =
						this.app.workspace.getActiveViewOfType(MarkdownView);
					if (!activeView) return;

					const editor = activeView.editor;
					const selection = editor.getSelection();
					const hasSelection = selection.trim().length > 0;
					const textToProcess = hasSelection
						? selection
						: editor.getValue();

					if (!textToProcess.trim()) return;

					const status = new Notice(`Modai: thinking...`, 0);

					try {
						const improvedText = await this.improveTextWithAi(
							instructions,
							textToProcess,
						);

						new DiffModal(
							this.app,
							textToProcess,
							improvedText,
							(finalText) => {
								if (hasSelection) {
									const from = editor.getCursor("from");
									const to = editor.getCursor("to");
									editor.replaceRange(finalText, from, to);
								} else {
									editor.setValue(finalText);
								}
								new Notice("Changes applied!");
							},
						).open();
					} catch (error) {
						console.error("Modai Error:", error);
						new Notice("Modai: error processing text.");
					} finally {
						status.hide();
					}
				},
			});

			this.addRibbonIcon("paw-print", "Modai: custom instructions", () =>
				this.customInstructions(),
			);

			this.addCommand({
				id: `modai-custom`,
				name: `Custom instructions`,
				callback: () => this.customInstructions(),
			});
		}
	}

	customInstructions() {
		const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
		if (!activeView) return;

		const editor = activeView.editor;
		const selection = editor.getSelection();
		const hasSelection = selection.trim().length > 0;
		const textToProcess = hasSelection ? selection : editor.getValue();

		if (!textToProcess.trim()) {
			new Notice("Document is empty.");
			return;
		}

		new CustomInstructionsModal(
			this.app,
			(instructions: string) => {
				if (!instructions.trim()) return;

				const processContent = async () => {
					const status = new Notice("Modai: thinking...", 0);
					try {
						const improvedText = await this.improveTextWithAi(
							instructions,
							textToProcess,
						);

						new DiffModal(
							this.app,
							textToProcess,
							improvedText,
							(finalText) => {
								if (hasSelection) {
									const from = editor.getCursor("from");
									const to = editor.getCursor("to");
									editor.replaceRange(finalText, from, to);
								} else {
									editor.setValue(finalText);
								}
								new Notice("Modai: changes applied!");
							},
						).open();
					} catch (error) {
						console.error("Modai Error:", error);
						new Notice("Modai: error processing text.");
					} finally {
						status.hide();
					}
				};

				processContent().catch((error) => {
					console.error("Modai Error:", error);
					new Notice("Modai: error processing text.");
				});
			},
			this.settings.roles,
		).open();
	}

	async improveTextWithAi(
		instructions: string,
		text: string,
	): Promise<string> {
		const message = `${instructions}
			### INPUT TEXT
			${text}`;

		let selectedProvider: provider;

		if (this.settings.model.startsWith("gpt")) {
			selectedProvider = new ChatGPT(this.settings.openAIKey);
		} else if (
			this.settings.model.startsWith("gemini") ||
			this.settings.model.startsWith("gemma")
		) {
			selectedProvider = new Gemini(this.settings.geminiAIKey);
		} else {
			throw new Error(
				`Unknown model provider for: ${this.settings.model}`,
			);
		}

		return await selectedProvider.call(
			message,
			this.settings.model,
			this.settings.temperature,
		);
	}

	onunload() {}

	async loadSettings() {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			(await this.loadData()) as Partial<ModaiSettingsTab>,
		);
	}

	async saveSettings() {
		await this.saveData(this.settings);
		this.statusBarSpan.setText(this.settings.model);
	}
}
