import {
	App,
	FuzzySuggestModal,
	Plugin,
	PluginSettingTab,
	Setting,
	TFolder,
} from "obsidian";
import { Role } from "roles";
import {
	PROVIDER_IDS,
	PROVIDERS,
	ProviderId,
	isProviderId,
	isSuggestedModel,
	providerForModel,
} from "providers/registry";

/** Dropdown value that reveals the free-text model field. */
const CUSTOM_MODEL = "__custom__";

interface ModAIPlugin extends Plugin {
	settings: PluginSettings;
	/** Roles read from the configured vault folder. */
	roles: Role[];
	saveSettings(): Promise<void>;
	refreshRoles(): Promise<void>;
}

export interface PluginSettings {
	provider: ProviderId;
	openAIKey: string;
	model: string;
	temperature: number;
	geminiAIKey: string;
	llamaAIKey: string;
	llamaBaseUrl: string;
	/** Vault folder holding one markdown file per role. */
	rolesFolder: string;
}

export const DEFAULT_SETTINGS: PluginSettings = {
	provider: "openai",
	openAIKey: "",
	model: "gpt-4-turbo",
	temperature: 0.7,
	geminiAIKey: "",
	llamaAIKey: "ollama",
	llamaBaseUrl: "http://localhost:11434",
	rolesFolder: "",
};

/**
 * Merges persisted data over the defaults, field by field, so settings written
 * by older versions (`roles` with inline instructions) are dropped.
 */
export function resolveSettings(
	data: Partial<PluginSettings> | null,
): PluginSettings {
	// Settings stored before the provider was selectable only carry a model,
	// which was matched against the provider prefixes at query time.
	const provider = isProviderId(data?.provider)
		? data.provider
		: providerForModel(data?.model ?? DEFAULT_SETTINGS.model);

	return {
		provider,
		openAIKey: data?.openAIKey ?? DEFAULT_SETTINGS.openAIKey,
		model: data?.model ?? DEFAULT_SETTINGS.model,
		temperature: data?.temperature ?? DEFAULT_SETTINGS.temperature,
		geminiAIKey: data?.geminiAIKey ?? DEFAULT_SETTINGS.geminiAIKey,
		llamaAIKey: data?.llamaAIKey ?? DEFAULT_SETTINGS.llamaAIKey,
		llamaBaseUrl: data?.llamaBaseUrl ?? DEFAULT_SETTINGS.llamaBaseUrl,
		rolesFolder: data?.rolesFolder ?? DEFAULT_SETTINGS.rolesFolder,
	};
}

export class ModaiSettingsTab extends PluginSettingTab {
	plugin: ModAIPlugin;

	/** Whether the model field shows the free-text input instead of a suggestion. */
	private customModel = false;

	constructor(app: App, plugin: ModAIPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		new Setting(containerEl).setName("Provider integration").setHeading();

		new Setting(containerEl)
			.setName("Provider")
			.setDesc("Service that receives your text")
			.addDropdown((dropdown) => {
				for (const id of PROVIDER_IDS) {
					dropdown.addOption(id, PROVIDERS[id].label);
				}
				dropdown
					.setValue(this.plugin.settings.provider)
					.onChange(async (value) => {
						if (!isProviderId(value)) return;

						this.plugin.settings.provider = value;
						if (
							!isSuggestedModel(value, this.plugin.settings.model)
						) {
							this.plugin.settings.model =
								PROVIDERS[value].defaultModel;
							this.customModel = false;
						}

						await this.plugin.saveSettings();
						this.display();
					});
			});

		new Setting(containerEl)
			.setName("Chat-GPT")
			.setDesc("Add an OpenAI key for access")
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
			.setDesc("Add a Gemini key for access")
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
			.setName("Llama key")
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
			.setName("Llama server")
			.setDesc("Address of your local model server")
			.addText((text) =>
				text
					.setPlaceholder("Enter the server address")
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

		const models = PROVIDERS[this.plugin.settings.provider].models;
		const customModel =
			this.customModel ||
			!isSuggestedModel(
				this.plugin.settings.provider,
				this.plugin.settings.model,
			);

		new Setting(containerEl)
			.setName("Model")
			.setDesc("Pick a suggested model or enter a model ID of your own")
			.addDropdown((dropdown) => {
				for (const model of models) {
					dropdown.addOption(model.id, model.label);
				}

				dropdown
					.addOption(CUSTOM_MODEL, "Custom model...")
					.setValue(
						customModel ? CUSTOM_MODEL : this.plugin.settings.model,
					)
					.onChange(async (value) => {
						this.customModel = value === CUSTOM_MODEL;
						if (!this.customModel) {
							this.plugin.settings.model = value;
						}

						await this.plugin.saveSettings();
						this.display();
					});
			});

		if (customModel) {
			new Setting(containerEl)
				.setName("Custom model")
				.setDesc("Any model ID accepted by the provider")
				.addText((text) =>
					text
						.setPlaceholder("Enter the model ID")
						.setValue(this.plugin.settings.model)
						.onChange(async (value) => {
							this.plugin.settings.model = value;
							await this.plugin.saveSettings();
						}),
				);
		}

		new Setting(containerEl).setName("Roles").setHeading();

		new Setting(containerEl)
			.setName("Roles folder")
			.setDesc(
				"Every Markdown file in this folder becomes a role: the file name is the role name, the content its instructions.",
			)
			.addText((text) => {
				text.setPlaceholder("Modai roles")
					.setValue(this.plugin.settings.rolesFolder)
					.onChange(async (value) => {
						this.plugin.settings.rolesFolder = value;
						await this.plugin.saveSettings();
					});
				// Refreshing on every keystroke would reload the roles for paths
				// that are still being typed.
				text.inputEl.addEventListener("blur", () => {
					void this.saveAndRefresh();
				});
			})
			.addButton((button) =>
				button.setButtonText("Browse").onClick(() => {
					new FolderSuggestModal(this.app, (folder) => {
						this.plugin.settings.rolesFolder = folder.path;
						void this.saveAndRefresh();
					}).open();
				}),
			);

		new Setting(containerEl)
			.setName("Roles found")
			.setDesc(this.rolesDescription());
	}

	private async saveAndRefresh(): Promise<void> {
		await this.plugin.saveSettings();
		await this.plugin.refreshRoles();
		this.display();
	}

	private rolesDescription(): string {
		const names = this.plugin.roles.map((role) => role.name);

		return names.length > 0
			? names.join(", ")
			: "No role files found in this folder.";
	}
}

/** Picker for the vault folder that holds the role files. */
class FolderSuggestModal extends FuzzySuggestModal<TFolder> {
	private onChoose: (folder: TFolder) => void;

	constructor(app: App, onChoose: (folder: TFolder) => void) {
		super(app);
		this.onChoose = onChoose;
		this.setPlaceholder("Select a folder for your role files");
	}

	getItems(): TFolder[] {
		return this.app.vault
			.getAllLoadedFiles()
			.filter((file) => file instanceof TFolder)
			.sort((a, b) => a.path.localeCompare(b.path));
	}

	getItemText(folder: TFolder): string {
		return folder.path;
	}

	onChooseItem(folder: TFolder): void {
		this.onChoose(folder);
	}
}
