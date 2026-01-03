import { App, Modal, Setting, ButtonComponent } from "obsidian";

export class CustomInstructionsModal extends Modal {
	result: string;
	suggestions: Record<string, string>;
	onSubmit: (result: string) => void;

	constructor(
		app: App,
		onSubmit: (result: string) => void,
		suggestions: Record<string, string>,
	) {
		super(app);
		this.onSubmit = onSubmit;
		this.suggestions = suggestions;
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.createEl("h2", { text: "Modai: AI instructions" });

		const chipContainer = contentEl.createDiv({
			cls: "modai-chip-container",
		});

		Object.entries(this.suggestions).forEach((entry) => {
			const label = entry[0];
			const content = entry[1];
			const chip = chipContainer.createEl("button", {
				text: label,
				cls: "modai-instruction-chip",
			});

			chip.addEventListener("click", () => {
				const textArea = contentEl.querySelector("textarea");
				if (textArea instanceof HTMLTextAreaElement) {
					textArea.value = content;
					this.result = content;
					textArea.focus();
				}
			});
		});

		new Setting(contentEl)
			.setClass("modai-full-width-setting")
			.addTextArea((text) => {
				text.setPlaceholder("Enter instructions here...").onChange(
					(value) => {
						this.result = value;
					},
				);

				setTimeout(() => text.inputEl.focus(), 50);
			});

		const footer = contentEl.createDiv({ cls: "modai-buttons" });

		new ButtonComponent(footer)
			.setButtonText("Cancel")
			.onClick(() => this.close());

		new ButtonComponent(footer)
			.setButtonText("Submit")
			.setCta()
			.onClick(() => this.handleSubmit());

		contentEl.addEventListener("keydown", (e) => {
			if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
				e.preventDefault();
				this.handleSubmit();
			}
		});
	}

	private handleSubmit() {
		if (!this.result.trim()) return;
		this.onSubmit(this.result);
		this.close();
	}

	onClose() {
		this.contentEl.empty();
	}
}
