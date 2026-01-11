import { App, Modal, Setting, ButtonComponent } from "obsidian";

export type ModaiResult = {
	instructions: string;
	type: "replace" | "ask";
};

export class CustomInstructionsModal extends Modal {
	instructions = "";
	suggestions: Record<string, string>;
	onSubmit: (result: ModaiResult) => void;

	constructor(
		app: App,
		onSubmit: (result: ModaiResult) => void,
		suggestions: Record<string, string>,
	) {
		super(app);
		this.onSubmit = onSubmit;
		this.suggestions = suggestions;
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.createEl("h2", { text: "Modai AI instructions" });

		const chipContainer = contentEl.createDiv({
			cls: "modai-chip-container",
		});

		Object.entries(this.suggestions).forEach(([label, content]) => {
			const chip = chipContainer.createEl("button", {
				text: label,
				cls: "modai-instruction-chip",
			});

			chip.addEventListener("click", () => {
				const textArea = contentEl.querySelector("textarea");
				if (textArea instanceof HTMLTextAreaElement) {
					textArea.value = content;
					this.instructions = content;
					textArea.focus();
				}
			});
		});

		new Setting(contentEl)
			.setClass("modai-full-width-setting")
			.addTextArea((text) => {
				text.setPlaceholder("Enter instructions here...").onChange(
					(value) => {
						this.instructions = value;
					},
				);
				setTimeout(() => text.inputEl.focus(), 50);
			});

		const footer = contentEl.createDiv({
			cls: "modai-buttons",
		});

		new ButtonComponent(footer)
			.setButtonText("Ask")
			.setCta()
			.setTooltip("Get a response based on the text (Ctrl/Cmd + A)")
			.onClick(() => this.handleSubmit("ask"));

		new ButtonComponent(footer)
			.setButtonText("Replace")
			.setTooltip(
				"Replace selection with AI output (Ctrl/Cmd + R or Enter)",
			)
			.setCta()
			.onClick(() => this.handleSubmit("replace"));

		contentEl.addEventListener("keydown", (e) => {
			const isMod = e.ctrlKey || e.metaKey;

			if (isMod && e.key === "Enter") {
				e.preventDefault();
				this.handleSubmit("replace");
			} else if (isMod && e.key.toLowerCase() === "r") {
				e.preventDefault();
				this.handleSubmit("replace");
			} else if (isMod && e.key.toLowerCase() === "a") {
				e.preventDefault();
				this.handleSubmit("ask");
			}
		});
	}

	private handleSubmit(type: "replace" | "ask") {
		if (!this.instructions.trim()) return;
		this.onSubmit({
			instructions: this.instructions,
			type: type,
		});
		this.close();
	}

	onClose() {
		this.contentEl.empty();
	}
}
