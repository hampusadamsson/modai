import { App, ButtonComponent, PluginSettingTab, Setting } from 'obsidian';
import ModAIPlugin from './main';
import { RoleAuthor, RoleEditor, RoleSEO } from 'defaults';

export interface PluginSettings {
	openAIKey: string;
	openAImodel: string;
	roles: Record<string, string>
}


export const DEFAULT_SETTINGS: PluginSettings = {
	openAIKey: '',
	openAImodel: 'gpt-3.5-turbo',

	roles: {
		'Text editor': RoleEditor,
		'SEO Engineer': RoleSEO,
		'Author': RoleAuthor,
	}
}

export class ModaiSettingsTab extends PluginSettingTab {
	plugin: ModAIPlugin;

	constructor(app: App, plugin: ModAIPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();
		new Setting(containerEl)
			.setName("Modai").setHeading()
			.setDesc("Create and modify roles that you can use in the command menu");

		// OpenAI key
		new Setting(containerEl)
			.setName('Key')
			.setDesc('Add an openai key for access')
			.addText(text => text
				.setPlaceholder('Enter text here')
				.setValue(this.plugin.settings.openAIKey)
				.onChange(async (value) => {
					this.plugin.settings.openAIKey = value;
					await this.plugin.saveSettings();
				}));

		// OpenAI model
		new Setting(containerEl)
			.setName('Model selection')
			.setDesc('Select what model to use (gpt-3.5-turbo, gpt-4, ..)')
			.addText(text => text
				.setPlaceholder('Enter text here')
				.setValue(this.plugin.settings.openAImodel)
				.onChange(async (value) => {
					this.plugin.settings.openAImodel = value;
					await this.plugin.saveSettings();
				}));

		// --- Dynamic Roles Section ---
		new Setting(containerEl).setName("Custom roles").setHeading();

		// 1. Add New Role Logic
		new Setting(containerEl)
			.setName('Add new role')
			.addText(text => {
				const textComp = text.setPlaceholder('Role name');
				new ButtonComponent(containerEl)
					.setButtonText('Add role')
					.setCta()
					.onClick(async () => {
						const newRole = textComp.getValue().trim();
						// Check if key exists in the object
						if (newRole && !(newRole in this.plugin.settings.roles)) {
							this.plugin.settings.roles[newRole] = "";
							await this.plugin.saveSettings();
							this.display();
						}
					});
			});

		// 2. List and Edit Existing Roles
		Object.entries(this.plugin.settings.roles).forEach(([role, value]) => {
			new Setting(containerEl)
				.setName(`Role: ${role}`)
				.addTextArea(text => {
					text.setValue(value)
						.onChange(async (newValue) => {
							this.plugin.settings.roles[role] = newValue;
							await this.plugin.saveSettings();
						});
				})
				.addButton(btn => {
					btn.setIcon('trash')
						.setWarning()
						.onClick(async () => {
							// Delete from the object
							delete this.plugin.settings.roles[role];
							await this.plugin.saveSettings();
							this.display();
						});
				});
		});
		containerEl.createEl('hr');
	}
}
