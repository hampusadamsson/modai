import { App, Modal, Setting, ButtonComponent } from 'obsidian';

export class CustomInstructionsModal extends Modal {
	result: string = "";
	onSubmit: (result: string) => void;

	constructor(app: App, onSubmit: (result: string) => void) {
		super(app);
		this.onSubmit = onSubmit;
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.createEl("h2", { text: "AI instructions" });

		const chipContainer = contentEl.createDiv({ cls: "modai-chip-container" });
		const suggestions = ["Fix grammar", "Summarize", "Professional tone", "Shorter", "Bullet points"];

		suggestions.forEach(label => {
			const chip = chipContainer.createEl("button", {
				text: label,
				cls: "modai-instruction-chip"
			});

			chip.addEventListener("click", () => {
				const textArea = contentEl.querySelector("textarea");
				if (textArea instanceof HTMLTextAreaElement) {
					textArea.value = label;
					this.result = label;
					textArea.focus();
				}
			});
		});

		new Setting(contentEl)
			.setClass("modai-full-width-setting")
			.addTextArea((text) => {
				text.setPlaceholder("Enter instructions here...")
					.onChange((value) => {
						this.result = value;
					});

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
