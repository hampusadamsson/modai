import { App, Modal, Setting } from 'obsidian';

export class CustomInstructionsModal extends Modal {
	result: string = "";
	onSubmit: (result: string) => void;

	constructor(app: App, onSubmit: (result: string) => void) {
		super(app);
		this.onSubmit = onSubmit;
	}


	onOpen() {
		const { contentEl } = this;
		contentEl.createEl("h2", { text: "Custom instructions for the AI" });

		new Setting(contentEl)
			.setDesc("Prompt text to alter the original text")
			.addTextArea((text) => {
				text.setPlaceholder("Rewrite this as a poem, summarize in 3 bullets.")
					.onChange((value) => {
						this.result = value;
					});
				text.inputEl.rows = 5;
				// eslint-disable-next-line obsidianmd/no-static-styles-assignment
				text.inputEl.style.width = "100%";
			});

		new Setting(contentEl)
			.addButton((btn) =>
				btn
					.setButtonText("Submit")
					.setCta()
					.onClick(() => {
						this.close();
						this.onSubmit(this.result);
					})
			);

		// Allow submitting with Enter key (Cmd/Ctrl + Enter)
		contentEl.addEventListener("keydown", (e) => {
			if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
				e.preventDefault();
				this.close();
				this.onSubmit(this.result);
			}
		});
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}

}

