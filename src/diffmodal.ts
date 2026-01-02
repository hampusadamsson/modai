import { Modal, App, ButtonComponent, Notice } from "obsidian";
import { diffWords, Change } from "diff";

export class DiffModal extends Modal {
	private result: string;
	private onAccept: (finalText: string) => void;

	constructor(app: App, private oldText: string, private newText: string, onAccept: (finalText: string) => void) {
		super(app);
		this.result = newText;
		this.onAccept = onAccept;
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.empty();

		contentEl.createEl("h2", { text: "Review the diff", cls: "modai-modal-title" });

		const diffContainer = contentEl.createDiv({ cls: "modai-diff-container" });

		const changes: Change[] = diffWords(this.oldText, this.newText);

		changes.forEach((part) => {
			const span = diffContainer.createEl("span", { text: part.value });

			if (part.added) {
				span.addClass("modai-diff-added");
				span.setAttribute("title", "Added");
			} else if (part.removed) {
				span.addClass("modai-diff-removed");
				span.setAttribute("title", "Removed");
			} else {
				span.addClass("modai-diff-unchanged");
			}
		});

		const buttonContainer = contentEl.createDiv({ cls: "modai-buttons" });

		new ButtonComponent(buttonContainer)
			.setButtonText("Accept changes")
			.setCta()
			.onClick(() => {
				this.onAccept(this.result);
				this.close();
			});

		new ButtonComponent(buttonContainer)
			.setButtonText("Cancel")
			.onClick(() => {
				new Notice("Changes discarded");
				this.close();
			});
	}

	onClose() {
		this.contentEl.empty();
	}
}
