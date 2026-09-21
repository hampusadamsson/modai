import { App, ButtonComponent, Modal, Platform, Setting } from "obsidian";
import { Role } from "roles";

export type ModaiResult = {
	instructions: string;
	type: "replace" | "ask";
};

export class CustomInstructionsModal extends Modal {
	instructions = "";
	roles: Role[];
	onSubmit: (result: ModaiResult) => void;

	constructor(
		app: App,
		onSubmit: (result: ModaiResult) => void,
		roles: Role[],
	) {
		super(app);
		this.onSubmit = onSubmit;
		this.roles = roles;
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.createEl("h2", { text: "Modai AI instructions" });

		const chipContainer = contentEl.createDiv({
			cls: "modai-chip-container",
		});

		for (const role of this.roles) {
			const chip = chipContainer.createEl("button", {
				text: role.name,
				cls: "modai-instruction-chip",
			});

			chip.addEventListener("click", () => {
				const textArea = contentEl.querySelector("textarea");
				if (textArea instanceof HTMLTextAreaElement) {
					textArea.value = role.instructions;
					this.instructions = role.instructions;
					textArea.focus();
				}
			});
		}

		new Setting(contentEl)
			.setClass("modai-full-width-setting")
			.addTextArea((text) => {
				text.setPlaceholder("Enter instructions here...").onChange(
					(value) => {
						this.instructions = value;
					},
				);
				window.setTimeout(() => text.inputEl.focus(), 50);
			});

		const footer = contentEl.createDiv({
			cls: "modai-buttons",
		});

		const mod = Platform.isMacOS ? "⌘" : "Ctrl";

		const ask = new ButtonComponent(footer)
			.setButtonText("Ask")
			.setCta()
			.setTooltip("Get a response based on the text")
			.onClick(() => this.handleSubmit("ask"));
		ask.buttonEl.createSpan({ cls: "modai-key", text: `${mod} A` });

		const replace = new ButtonComponent(footer)
			.setButtonText("Replace")
			.setTooltip("Replace the selection with the AI output")
			.setCta()
			.onClick(() => this.handleSubmit("replace"));
		replace.buttonEl.createSpan({ cls: "modai-key", text: `${mod} ↵` });

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
