import { App, ButtonComponent, PluginSettingTab, Setting } from 'obsidian';
import ModAIPlugin from './main';
import { RoleAuthor, RoleEditor, RoleSEO } from 'defaults';

export interface PluginSettings {
	openAIKey: string;
	model: string;
	temperature: number;
	geminiAIKey: string,
	roles: Record<string, string>
}


export const DEFAULT_SETTINGS: PluginSettings = {
	openAIKey: '',
	model: 'gpt-4-turbo',
	temperature: 0.7,
	geminiAIKey: '',
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
			.setName('Key')
			.setDesc('Add an openai key for access')
			.addText(text => text
				.setPlaceholder('Enter text here')
				.setValue(this.plugin.settings.openAIKey)
				.onChange(async (value) => {
					this.plugin.settings.openAIKey = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Key')
			.setDesc('Add a gemini key for access')
			.addText(text => text
				.setPlaceholder('Enter text here')
				.setValue(this.plugin.settings.geminiAIKey)
				.onChange(async (value) => {
					this.plugin.settings.geminiAIKey = value;
					await this.plugin.saveSettings();
				}));


		new Setting(containerEl)
			.setName('Temperature')
			.setDesc('Set llm temperature (0.1 - 1.0). Higher values make output more creative, lower more deterministic.')
			.addSlider(slider => slider
				.setLimits(0.1, 1, 0.1)
				.setValue(this.plugin.settings.temperature)
				.setDynamicTooltip()
				.onChange(async (value) => {
					this.plugin.settings.temperature = value;
					await this.plugin.saveSettings();
				}));


		new Setting(containerEl)
			.setName('Model selection')
			.setDesc('Select the openai model to use.')
			.addDropdown(dropdown => dropdown
				.addOption('gpt-5.2', 'Gpt-5.2 (flagship reasoning)')
				.addOption('gpt-5.2-pro', 'Gpt-5.2 pro (research & smarts)')
				.addOption('gpt-5.1', 'Gpt-5.1 (balanced performance)')
				.addOption('gpt-5', 'Gpt-5 (standard reasoning)')
				.addOption('gpt-5-mini', 'Gpt-5 mini (fast & affordable)')
				.addOption('gpt-5-nano', 'Gpt-5 nano (high speed/low cost)')
				.addOption('gpt-4.1', 'Gpt-4.1 (stable general purpose)')
				.addOption('gpt-4.1-mini', 'Gpt-4.1 mini (efficient all-rounder)')
				.addOption('gpt-4o', 'Gpt-4o (omni/multimodal)')
				.addOption('gpt-4o-mini', 'Gpt-4o mini (budget omni)')
				.addOption('gpt-4-turbo', 'Gpt-4 turbo (stable legacy)')
				.addOption('gpt-4', 'Gpt-4 (original high-int)')
				.addOption('gpt-3.5-turbo', 'Gpt-3.5 turbo')
				.addOption('gemini-3-pro', 'Gemini 3 pro (state-of-the-art reasoning & agents)')
				.addOption('gemini-3-flash', 'Gemini 3 flash (fast, intelligent default)')
				.addOption('gemini-2.5-pro', 'Gemini 2.5 pro (stable deep reasoning, 1m context)')
				.addOption('gemini-2.5-flash', 'Gemini 2.5 flash (balanced speed & production stability)')
				.addOption('gemini-2.5-flash-lite', 'Gemini 2.5 Flash-Lite (Budget / High-throughput)')
				.setValue(this.plugin.settings.model)
				.onChange(async (value) => {
					this.plugin.settings.model = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl).setName("Custom roles").setHeading();

		new Setting(containerEl)
			.setName('Add new role')
			.addText(text => {
				const textComp = text.setPlaceholder('Role name');
				new ButtonComponent(containerEl)
					.setButtonText('Add role')
					.setCta()
					.onClick(async () => {
						const newRole = textComp.getValue().trim();
						if (newRole && !(newRole in this.plugin.settings.roles)) {
							this.plugin.settings.roles[newRole] = "";
							await this.plugin.saveSettings();
							this.display();
						}
					});
			});

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
							delete this.plugin.settings.roles[role];
							await this.plugin.saveSettings();
							this.display();
						});
				});
		});
		containerEl.createEl('hr');
	}
}
