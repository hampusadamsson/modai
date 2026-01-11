import { MarkdownView, Notice, Plugin } from "obsidian";
import { DEFAULT_SETTINGS, ModaiSettingsTab, PluginSettings } from "./settings";
import {
	CustomInstructionsModal,
	ModaiResult,
} from "modals/customInstructionsModal";
import { provider } from "providers/base";
import { Gemini } from "providers/gemini";
import { ChatGPT } from "providers/chatgpt";
import { DeleteModal } from "modals/diffmodal";
import { Llama } from "providers/llama";
import { AskModal } from "modals/responsemodal";

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
				id: `Modai-${role}`,
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

					const status = new Notice(
						`Modai: ${this.settings.model} thinking...`,
						0,
					);

					try {
						const improvedText = await this.queryProvider(
							instructions,
							textToProcess,
						);

						new DeleteModal(
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
				name: `Use custom instructions`,
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
			(result: ModaiResult) => {
				if (!result.instructions.trim()) return;

				const processContent = async () => {
					const status = new Notice(
						`Modai: ${this.settings.model} thinking...`,
						0,
					);
					try {
						const from = editor.getCursor("from");
						const to = editor.getCursor("to");
						const response = await this.queryProvider(
							result.instructions,
							textToProcess,
						);
						if (result.type === "replace") {
							new DeleteModal(
								this.app,
								textToProcess,
								response,
								(finalText) => {
									if (hasSelection) {
										editor.replaceRange(
											finalText,
											from,
											to,
										);
									} else {
										editor.setValue(finalText);
									}
									new Notice("Modai: changes applied!");
								},
							).open();
						} else if (result.type === "ask") {
							new AskModal(
								this.app,
								this.settings.model,
								response,
							).open();
						}
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

	async queryProvider(instructions: string, text: string): Promise<string> {
		const message = `${instructions}
			### INPUT TEXT
			${text}`;

		let selectedProvider: provider;

		if (this.settings.model.startsWith("gpt")) {
			selectedProvider = new ChatGPT(this.settings.openAIKey);
		} else if (this.settings.model.startsWith("gemini")) {
			selectedProvider = new Gemini(this.settings.geminiAIKey);
		} else if (this.settings.model.startsWith("llama")) {
			selectedProvider = new Llama(
				this.settings.llamaAIKey,
				this.settings.llamaBaseUrl,
			);
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
