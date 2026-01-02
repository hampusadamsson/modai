import { MarkdownView, Notice, Plugin } from 'obsidian';
import { DEFAULT_SETTINGS, ModaiSettingsTab, PluginSettings } from "./settings";
import { CustomInstructionsModal } from 'modal';
import { provider } from 'providers/base';
import { Gemini } from 'providers/gemini';
import { ChatGPT } from 'providers/chatgpt';

export default class Modai extends Plugin {
	settings: PluginSettings;
	statusBarSpan: HTMLSpanElement;

	async onload() {
		await this.loadSettings();

		const item = this.addStatusBarItem();
		this.statusBarSpan = item.createEl('span', { text: this.settings.model });

		this.addSettingTab(new ModaiSettingsTab(this.app, this));
		for (const [role, instructions] of Object.entries(this.settings.roles)) {

			this.addCommand({
				id: `modai-${role}`,
				name: `use ${role}`,
				callback: async () => {
					const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
					if (!activeView) return;

					const editor = activeView.editor;

					const selection = editor.getSelection();
					const from = editor.getCursor("from");
					const to = editor.getCursor("to");

					const hasSelection = selection.trim().length > 0;
					const textToProcess = hasSelection ? selection : editor.getValue();

					if (!textToProcess.trim()) return;

					const status = new Notice(`Modai: ${this.settings.model} thinking...`, 0);

					try {
						const improvedText = await this.improveTextWithAi(instructions, textToProcess);

						if (hasSelection) {
							editor.replaceRange(improvedText, from, to);
						} else {
							const lastLine = editor.lineCount() - 1;
							const lastChar = editor.getLine(lastLine).length;
							editor.replaceRange(improvedText, { line: 0, ch: 0 }, { line: lastLine, ch: lastChar });
						}

					} catch (error) {
						console.error("Modai Error:", error);
						new Notice("Modai: error processing text.");
					} finally {
						status.hide();
						new Notice("Modai: ready");
					}
				}
			});
			this.addCommand({
				id: `modai-custom`,
				name: `Custom instructions`,
				callback: () => {
					const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
					if (!activeView) return;

					const editor = activeView.editor;

					const selection = editor.getSelection();
					const from = editor.getCursor("from");
					const to = editor.getCursor("to");

					const hasSelection = selection.trim().length > 0;
					const textToProcess = hasSelection ? selection : editor.getValue();

					if (!textToProcess.trim()) {
						new Notice("Document is empty.");
						return;
					}


					new CustomInstructionsModal(this.app, (instructions: string) => {
						if (!instructions.trim()) return;

						const processContent = async () => {
							const status = new Notice("Modai: thinking...", 0);
							try {
								const improvedText = await this.improveTextWithAi(instructions, textToProcess);

								if (hasSelection) {
									editor.replaceRange(improvedText, from, to);
								} else {
									const lastLine = editor.lineCount() - 1;
									const lastChar = editor.getLine(lastLine).length;
									editor.replaceRange(improvedText, { line: 0, ch: 0 }, { line: lastLine, ch: lastChar });
								}

								new Notice("Modai: finished");
							} catch (error) {
								console.error("Modai Error:", error);
								new Notice("Modai: error processing text.");
							} finally {
								status.hide();
							}
						};

						processContent().catch(error => {
							console.error("Modai Error:", error);
							new Notice("Modai: error processing text.");
						});
					}).open();

				}
			});
		}
	}

	async improveTextWithAi(instructions: string, text: string): Promise<string> {
		const message: string = `${instructions}
			### INPUT TEXT
			${text}`;

		let selectedProvider: provider;

		if (this.settings.model.startsWith("gpt")) {
			selectedProvider = new ChatGPT(this.settings.openAIKey);
		} else if (this.settings.model.startsWith("gemini") || this.settings.model.startsWith("gemma")) {
			selectedProvider = new Gemini(this.settings.geminiAIKey);
		} else {
			throw new Error(`Unknown model provider for: ${this.settings.model}`);
		}

		return await selectedProvider.call(
			message,
			this.settings.model,
			this.settings.temperature
		);
	}

	onunload() {
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData() as Partial<ModaiSettingsTab>);
	}

	async saveSettings() {
		await this.saveData(this.settings);

		this.statusBarSpan.setText(this.settings.model);
	}
}

