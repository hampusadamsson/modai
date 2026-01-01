import { MarkdownView, Notice, Plugin, requestUrl } from 'obsidian';
import { DEFAULT_SETTINGS, ModaiSettingsTab, PluginSettings } from "./settings";
import { CustomInstructionsModal } from 'modal';

interface OpenAIResponse {
	choices?: {
		message?: {
			content?: string;
		};
	}[];
}

export default class Modai extends Plugin {
	settings: PluginSettings;

	async onload() {
		await this.loadSettings();

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new ModaiSettingsTab(this.app, this));
		for (const [role, instructions] of Object.entries(this.settings.roles)) {

			this.addCommand({
				id: `modai-${role}`,
				name: `use ${role}`,
				callback: async () => {
					const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
					if (!activeView) return;

					const editor = activeView.editor;

					// 1. Capture positions and content BEFORE the async await
					const selection = editor.getSelection();
					const from = editor.getCursor("from"); // Start of selection
					const to = editor.getCursor("to");     // End of selection

					// Determine what text we are processing
					const hasSelection = selection.trim().length > 0;
					const textToProcess = hasSelection ? selection : editor.getValue();

					if (!textToProcess.trim()) return;

					const status = new Notice("Modai: thinking...", 0);

					try {
						// 2. Run the AI process
						const improvedText = await this.improveTextWithAi(instructions, textToProcess);

						// 3. Apply the change using replaceRange
						if (hasSelection) {
							// Replace exactly what was selected
							editor.replaceRange(improvedText, from, to);
						} else {
							// Replace entire document
							// From the very start (0,0) to the very end of the last line
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

					// 1. Capture state immediately
					const selection = editor.getSelection();
					const from = editor.getCursor("from");
					const to = editor.getCursor("to");

					const hasSelection = selection.trim().length > 0;
					const textToProcess = hasSelection ? selection : editor.getValue();

					if (!textToProcess.trim()) {
						new Notice("Document is empty.");
						return;
					}


					// 2. Open the Modal
					new CustomInstructionsModal(this.app, (instructions: string) => {
						if (!instructions.trim()) return;

						// Use an immediately-invoked async function (IIFE) or a local function
						const processContent = async () => {
							const status = new Notice("Modai: thinking...", 0);
							try {
								// 3. Process with AI
								const improvedText = await this.improveTextWithAi(instructions, textToProcess);

								// 4. Replace Range
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

						// Execute the async logic
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

		return await this.queryLLM(message);
	}

	async queryLLM(message: string): Promise<string> {
		try {
			const response = await requestUrl({
				url: 'https://api.openai.com/v1/chat/completions',
				method: 'POST',
				headers: {
					'Authorization': `Bearer ${this.settings.openAIKey}`,
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					model: this.settings.openAImodel,
					messages: [
						{ role: 'user', content: message },
					],
					temperature: this.settings.temperature
				})
			});

			// Cast the json property to our interface
			const result = response.json as OpenAIResponse;
			const improvedText = result?.choices?.[0]?.message?.content?.trim();
			if (!improvedText) {
				throw new Error(response.text);
			}
			return improvedText;
		} catch (error) {
			console.error('LLM response Error:', error);
			throw new Error(error instanceof Error ? error.message : String(error));
		}
	}

	onunload() {
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData() as Partial<ModaiSettingsTab>);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

