import { App, ButtonComponent, Modal, Setting } from "obsidian";
import { Role } from "roles";

export type ModaiResult = {
	instructions: string;
	type: "suggest" | "review";
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

		new ButtonComponent(footer)
			.setButtonText("Review")
			.setCta()
			.setTooltip("Review the text and say what stands out")
			.onClick(() => this.handleSubmit("review"));

		new ButtonComponent(footer)
			.setButtonText("Suggest")
			.setTooltip("Suggest changes as applicable items")
			.setCta()
			.onClick(() => this.handleSubmit("suggest"));
	}

	private handleSubmit(type: "suggest" | "review") {
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
