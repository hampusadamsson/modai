import { App, Modal, MarkdownRenderer, Component } from "obsidian";

export class AskModal extends Modal {
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
		const component = new Component();
		component.load();
		await MarkdownRenderer.render(
			this.app,
			this.response,
			markdownWrapper,
			"",
			component,
		);
	}

	onClose() {
		this.contentEl.empty();
	}
}
