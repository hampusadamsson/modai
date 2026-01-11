import { App, Notice, PluginSettingTab, Setting, Plugin } from "obsidian";
import { RoleAuthor, RoleEditor, RoleSEO, RoleImprovement } from "roles";

interface ModAIPlugin extends Plugin {
	settings: PluginSettings;
	saveSettings(): Promise<void>;
}

export interface PluginSettings {
	openAIKey: string;
	model: string;
	temperature: number;
	geminiAIKey: string;
	llamaAIKey: string;
	llamaBaseUrl: string;
	roles: Record<string, string>;
}

export const DEFAULT_SETTINGS: PluginSettings = {
	openAIKey: "",
	model: "gpt-4-turbo",
	temperature: 0.7,
	geminiAIKey: "",
	llamaAIKey: "ollama",
	llamaBaseUrl: "http://localhost:11434",
	roles: {
		"Text editor": RoleEditor,
		"SEO Engineer": RoleSEO,
		Author: RoleAuthor,
		"Strategic consultant": RoleImprovement,
	},
};

export class ModaiSettingsTab extends PluginSettingTab {
	plugin: ModAIPlugin;

	constructor(app: App, plugin: ModAIPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		new Setting(containerEl).setName("Provider integration").setHeading();

		new Setting(containerEl)
			.setName("Chat-gpt")
			.setDesc("Add an openai key for access")
			.addText((text) =>
				text
					.setPlaceholder("Enter text here")
					.setValue(this.plugin.settings.openAIKey)
					.onChange(async (value) => {
						this.plugin.settings.openAIKey = value;
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName("Gemini")
			.setDesc("Add a gemini key for access")
			.addText((text) =>
				text
					.setPlaceholder("Enter text here")
					.setValue(this.plugin.settings.geminiAIKey)
					.onChange(async (value) => {
						this.plugin.settings.geminiAIKey = value;
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName("Llama")
			.setDesc("Add a llama key for access")
			.addText((text) =>
				text
					.setPlaceholder("Enter text here")
					.setValue(this.plugin.settings.llamaAIKey)
					.onChange(async (value) => {
						this.plugin.settings.llamaAIKey = value;
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName("Llama")
			.setDesc("Add llama ")
			.addText((text) =>
				text
					.setPlaceholder("Llama server")
					.setValue(this.plugin.settings.llamaBaseUrl)
					.onChange(async (value) => {
						this.plugin.settings.llamaBaseUrl = value;
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName("Temperature")
			.setDesc(
				"Set llm temperature (0.1 - 1.0). Higher values make output more creative, lower more deterministic.",
			)
			.addSlider((slider) =>
				slider
					.setLimits(0.1, 1, 0.1)
					.setValue(this.plugin.settings.temperature)
					.setDynamicTooltip()
					.onChange(async (value) => {
						this.plugin.settings.temperature = value;
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName("Model selection")
			.setDesc("Select the openai model to use.")
			.addDropdown((dropdown) =>
				dropdown
					.addOption("gpt-5.2", "Gpt-5.2 (flagship reasoning)")
					.addOption("gpt-5.2-pro", "Gpt-5.2 pro (research & smarts)")
					.addOption("gpt-5.1", "Gpt-5.1 (balanced performance)")
					.addOption("gpt-5", "Gpt-5 (standard reasoning)")
					.addOption("gpt-5-mini", "Gpt-5 mini (fast & affordable)")
					.addOption("gpt-5-nano", "Gpt-5 nano (high speed/low cost)")
					.addOption("gpt-4.1", "Gpt-4.1 (stable general purpose)")
					.addOption(
						"gpt-4.1-mini",
						"Gpt-4.1 mini (efficient all-rounder)",
					)
					.addOption("gpt-4o", "Gpt-4o (omni/multimodal)")
					.addOption("gpt-4o-mini", "Gpt-4o mini (budget omni)")
					.addOption("gpt-4-turbo", "Gpt-4 turbo (stable legacy)")
					.addOption("gpt-4", "Gpt-4 (original high-int)")
					.addOption("gpt-3.5-turbo", "Gpt-3.5 turbo")
					.addOption(
						"gemini-3-pro",
						"Gemini 3 pro (state-of-the-art reasoning & agents)",
					)
					.addOption(
						"gemini-3-flash",
						"Gemini 3 flash (fast, intelligent default)",
					)
					.addOption(
						"gemini-2.5-pro",
						"Gemini 2.5 pro (stable deep reasoning, 1m context)",
					)
					.addOption(
						"gemini-2.5-flash",
						"Gemini 2.5 flash (balanced speed & production stability)",
					)
					.addOption(
						"gemini-2.5-flash-lite",
						"Gemini 2.5 Flash-Lite (Budget / High-throughput)",
					)
					.addOption("llama3.1:8b", "Llama 3.1 8b (local deployment)")
					.addOption(
						"llama-3-70b",
						"Llama 3 70b (local deployment, high performance)",
					)
					.addOption(
						"llama-2-70b",
						"Llama 2 70b (local deployment, widely supported)",
					)
					.addOption(
						"llama-2-13b",
						"Llama 2 13b (local deployment, balanced size)",
					)
					.addOption(
						"llama-2-7b",
						"Llama 2 7b (local deployment, lightweight)",
					)
					.setValue(this.plugin.settings.model)
					.onChange(async (value) => {
						this.plugin.settings.model = value;
						await this.plugin.saveSettings();
					}),
			);

		const createContainer = containerEl.createDiv({
			cls: "modai-create-role-container",
		});
		new Setting(createContainer).setName("Custom roles").setHeading();

		let newRolesName = "";
		new Setting(createContainer)
			.setName("Role name")
			.setDesc("Call it 'poet' or 'fact-checker'")
			.addText((text) => {
				text.setPlaceholder("Enter role name...").onChange(
					(value) => (newRolesName = value),
				);
			})
			.addButton((btn) => {
				btn.setButtonText("Add role")
					.setCta()
					.setIcon("plus")
					.onClick(() => handleCreateRole());
			});

		const handleCreateRole = async () => {
			const newRole = newRolesName.trim();
			if (newRole && !(newRole in this.plugin.settings.roles)) {
				this.plugin.settings.roles[newRole] = "";
				await this.plugin.saveSettings();
				newRolesName = "";
				this.display();
			} else if (newRole) {
				new Notice("Role already exists");
			}
		};

		Object.entries(this.plugin.settings.roles).forEach(([role, value]) => {
			const roleSetting = new Setting(containerEl)
				.setClass("modai-role-setting")
				.setName(role)
				.setDesc(`Instruction for ${role}:`);

			roleSetting.addTextArea((text) => {
				text.inputEl.addClass("modai-role-textarea");
				text.setValue(value)
					.setPlaceholder("System instructions for the AI...")
					.onChange(async (newValue) => {
						this.plugin.settings.roles[role] = newValue;
						await this.plugin.saveSettings();
					});
				text.inputEl.rows = 4;
			});

			roleSetting.addButton((btn) => {
				btn.setIcon("trash")
					.setCta()
					.setIcon("minus")
					.setTooltip("Delete role")
					.onClick(async () => {
						delete this.plugin.settings.roles[role];
						await this.plugin.saveSettings();
						this.display();
					});
			});
		});
	}
}
