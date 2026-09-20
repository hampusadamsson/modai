import { App, Modal, MarkdownRenderer, Component } from "obsidian";

export class AskModal extends Modal {
	private component = new Component();

	constructor(
		app: App,
		private model: string,
		private response: string,
	) {
		super(app);
	}

	async onOpen() {
		const { contentEl } = this;
		contentEl.empty();

		const headerContainer = contentEl.createDiv({
			cls: "modai-modal-header",
		});
		headerContainer.createEl("h2", { text: this.model });

		contentEl.createEl("hr");

		const markdownWrapper = contentEl.createDiv({
			cls: "modai-readme-content",
		});
		this.component.load();
		await MarkdownRenderer.render(
			this.app,
			this.response,
			markdownWrapper,
			"",
			this.component,
		);
	}

	onClose() {
		this.component.unload();
		this.contentEl.empty();
	}
}
