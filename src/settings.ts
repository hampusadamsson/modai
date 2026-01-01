/* eslint-disable obsidianmd/ui/sentence-case */
import { App, ButtonComponent, PluginSettingTab, Setting } from 'obsidian';
import ModAIPlugin from './main';
import { RoleAuthor, RoleEditor, RoleSEO } from 'defaults';

export interface PluginSettings {
	openAIKey: string;
	openAImodel: string;
	temperature: number;
	roles: Record<string, string>
}


export const DEFAULT_SETTINGS: PluginSettings = {
	openAIKey: '',
	openAImodel: 'gpt-5-mini',
	temperature: 0.7,
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

		// LLM Temp
		new Setting(containerEl)
			.setName('Temperature')
			.setDesc('Set LLM temperature (0.1 - 1.0). Higher values make output more creative, lower more deterministic.')
			.addSlider(slider => slider
				.setLimits(0.1, 1, 0.1) // Min: 0.1, Max: 1, Step: 0.1
				.setValue(this.plugin.settings.temperature)
				.setDynamicTooltip() // Shows the value as you drag
				.onChange(async (value) => {
					this.plugin.settings.temperature = value;
					await this.plugin.saveSettings();
				}));


		// OpenAI model selection
		new Setting(containerEl)
			.setName('Model selection')
			.setDesc('Select the openai model to use.')
			.addDropdown(dropdown => dropdown
				.addOption('gpt-5.2', 'GPT-5.2 (Flagship Reasoning)')
				.addOption('gpt-5.2-pro', 'GPT-5.2 Pro (Research & Smarts)')
				.addOption('gpt-5.1', 'GPT-5.1 (Balanced Performance)')
				.addOption('gpt-5', 'GPT-5 (Standard Reasoning)')
				.addOption('gpt-5-mini', 'GPT-5 Mini (Fast & Affordable)')
				.addOption('gpt-5-nano', 'GPT-5 Nano (High Speed/Low Cost)')
				.addOption('o3', 'o3 (Advanced STEM & Logic)')
				.addOption('o3-pro', 'o3 Pro (Highest Reasoning Effort)')
				.addOption('o3-mini', 'o3 Mini (Fast Reasoning)')
				.addOption('o4-mini', 'o4-mini (Efficient STEM Reasoning)')
				.addOption('o1', 'o1 (Legacy Reasoning)')
				.addOption('o1-mini', 'o1-mini (Legacy Reasoning Mini)')
				.addOption('gpt-4.1', 'GPT-4.1 (Stable General Purpose)')
				.addOption('gpt-4.1-mini', 'GPT-4.1 Mini (Efficient All-rounder)')
				.addOption('gpt-4o', 'GPT-4o (Omni/Multimodal)')
				.addOption('gpt-4o-mini', 'GPT-4o Mini (Budget Omni)')
				.addOption('gpt-4-turbo', 'GPT-4 Turbo (Stable Legacy)')
				.addOption('gpt-4', 'GPT-4 (Original High-Int)')
				.addOption('gpt-3.5-turbo', 'Gpt-3.5 turbo')
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
					text.inputEl.rows = 5;
					text.inputEl.cols = 50;
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
