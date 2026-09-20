import {
	App,
	FuzzySuggestModal,
	Plugin,
	PluginSettingTab,
	Setting,
	SettingDefinitionItem,
	TFolder,
	requireApiVersion,
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

	/** Whether the model dropdown sits on its custom entry. */
	private customModel = false;
	/** Set once Obsidian asks for definitions, i.e. on 1.13 and later. */
	private declarative = false;

	constructor(app: App, plugin: ModAIPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	/**
	 * Settings as definitions, used by Obsidian 1.13 and later: they show up in
	 * the settings search and render without the deprecated imperative API.
	 */
	getSettingDefinitions(): SettingDefinitionItem[] {
		this.declarative = true;

		return [
			{
				type: "group",
				heading: "Provider integration",
				items: [
					{
						name: "Provider",
						desc: "Service that receives your text",
						control: {
							type: "dropdown",
							key: "provider",
							options: this.providerOptions(),
						},
					},
					{
						name: "Chat-GPT",
						desc: "Add an OpenAI key for access",
						control: { type: "text", key: "openAIKey" },
					},
					{
						name: "Gemini",
						desc: "Add a Gemini key for access",
						control: { type: "text", key: "geminiAIKey" },
					},
					{
						name: "Llama key",
						desc: "Add a llama key for access",
						control: { type: "text", key: "llamaAIKey" },
					},
					{
						name: "Llama server",
						desc: "Address of your local model server",
						control: { type: "text", key: "llamaBaseUrl" },
					},
					{
						name: "Temperature",
						desc: "Higher values make output more creative, lower more deterministic",
						control: {
							type: "slider",
							key: "temperature",
							min: 0.1,
							max: 1,
							step: 0.1,
							displayFormat: (value) => value.toFixed(1),
						},
					},
				],
			},
			{
				type: "group",
				heading: "Model",
				items: [
					{
						name: "Model",
						desc: "Pick a suggested model or enter a model ID of your own",
						control: {
							type: "dropdown",
							key: "modelChoice",
							options: this.modelOptions(),
						},
					},
					{
						name: "Custom model",
						desc: "Any model ID accepted by the provider",
						visible: () => this.isCustomModel(),
						control: {
							type: "text",
							key: "model",
							placeholder: "Enter the model ID",
						},
					},
				],
			},
			{
				type: "group",
				heading: "Roles",
				items: [
					{
						name: "Roles folder",
						desc: "Every Markdown file in this folder becomes a role: the file name is the role name, the content its instructions.",
						control: {
							type: "folder",
							key: "rolesFolder",
							placeholder: "Modai roles",
						},
					},
					{ name: "Roles found", desc: this.rolesDescription() },
				],
			},
		];
	}

	getControlValue(key: string): unknown {
		const settings = this.plugin.settings;

		switch (key) {
			case "provider":
				return settings.provider;
			case "modelChoice":
				return this.isCustomModel() ? CUSTOM_MODEL : settings.model;
			case "model":
				return settings.model;
			case "temperature":
				return settings.temperature;
			case "rolesFolder":
				return settings.rolesFolder;
			case "openAIKey":
				return settings.openAIKey;
			case "geminiAIKey":
				return settings.geminiAIKey;
			case "llamaAIKey":
				return settings.llamaAIKey;
			case "llamaBaseUrl":
				return settings.llamaBaseUrl;
			default:
				return undefined;
		}
	}

	async setControlValue(key: string, value: unknown): Promise<void> {
		const settings = this.plugin.settings;

		switch (key) {
			case "provider": {
				if (!isProviderId(value)) return;
				settings.provider = value;
				if (!isSuggestedModel(value, settings.model)) {
					settings.model = PROVIDERS[value].defaultModel;
					this.customModel = false;
				}
				await this.plugin.saveSettings();
				this.refresh();
				return;
			}
			case "modelChoice": {
				if (typeof value !== "string") return;
				this.customModel = value === CUSTOM_MODEL;
				if (!this.customModel) settings.model = value;
				await this.plugin.saveSettings();
				this.refresh();
				return;
			}
			case "model": {
				if (typeof value !== "string") return;
				settings.model = value;
				break;
			}
			case "temperature": {
				if (typeof value !== "number") return;
				settings.temperature = value;
				break;
			}
			case "rolesFolder": {
				if (typeof value !== "string") return;
				if (value === settings.rolesFolder) return;
				settings.rolesFolder = value;
				await this.plugin.saveSettings();
				await this.plugin.refreshRoles();
				this.refresh();
				return;
			}
			case "openAIKey":
			case "geminiAIKey":
			case "llamaAIKey":
			case "llamaBaseUrl": {
				if (typeof value !== "string") return;
				settings[key] = value;
				break;
			}
			default:
				return;
		}

		await this.plugin.saveSettings();
	}

	/**
	 * Re-renders what the tab shows: the definitions on 1.13 and later, the
	 * imperative layout below on older versions.
	 */
	private refresh(): void {
		if (this.declarative) {
			if (requireApiVersion("1.13.0")) {
				this.update();
				return;
			}
		}

		this.renderLegacy();
	}

	/** Rendered by Obsidian on versions older than 1.13.0. */
	display(): void {
		this.renderLegacy();
	}

	/** Fallback layout for Obsidian versions older than 1.13.0. */
	private renderLegacy(): void {
		const { containerEl } = this;
		containerEl.empty();

		new Setting(containerEl).setName("Provider integration").setHeading();
		this.renderDropdown(containerEl, {
			name: "Provider",
			desc: "Service that receives your text",
			key: "provider",
			options: this.providerOptions(),
		});
		this.renderText(
			containerEl,
			"Chat-GPT",
			"Add an OpenAI key for access",
			"openAIKey",
		);
		this.renderText(
			containerEl,
			"Gemini",
			"Add a Gemini key for access",
			"geminiAIKey",
		);
		this.renderText(
			containerEl,
			"Llama key",
			"Add a llama key for access",
			"llamaAIKey",
		);
		this.renderText(
			containerEl,
			"Llama server",
			"Address of your local model server",
			"llamaBaseUrl",
		);
		this.renderTemperature(containerEl);

		new Setting(containerEl).setName("Model").setHeading();
		this.renderDropdown(containerEl, {
			name: "Model",
			desc: "Pick a suggested model or enter a model ID of your own",
			key: "modelChoice",
			options: this.modelOptions(),
		});
		if (this.isCustomModel()) {
			this.renderText(
				containerEl,
				"Custom model",
				"Any model ID accepted by the provider",
				"model",
			);
		}

		new Setting(containerEl).setName("Roles").setHeading();
		this.renderRolesFolder(containerEl);
		new Setting(containerEl)
			.setName("Roles found")
			.setDesc(this.rolesDescription());
	}

	private renderText(
		containerEl: HTMLElement,
		name: string,
		desc: string,
		key: string,
	): void {
		new Setting(containerEl)
			.setName(name)
			.setDesc(desc)
			.addText((text) =>
				text.setValue(this.stringValue(key)).onChange(async (value) => {
					await this.setControlValue(key, value);
				}),
			);
	}

	private renderDropdown(
		containerEl: HTMLElement,
		options: {
			name: string;
			desc: string;
			key: string;
			options: Record<string, string>;
		},
	): void {
		new Setting(containerEl)
			.setName(options.name)
			.setDesc(options.desc)
			.addDropdown((dropdown) =>
				dropdown
					.addOptions(options.options)
					.setValue(this.stringValue(options.key))
					.onChange(async (value) => {
						await this.setControlValue(options.key, value);
					}),
			);
	}

	private renderTemperature(containerEl: HTMLElement): void {
		const temperature = this.plugin.settings.temperature;

		new Setting(containerEl)
			.setName("Temperature")
			.setDesc(
				`Currently ${temperature.toFixed(1)} (0.1 - 1.0). Higher values make output more creative, lower more deterministic.`,
			)
			.addSlider((slider) =>
				slider
					.setLimits(0.1, 1, 0.1)
					.setValue(temperature)
					.onChange(async (value) => {
						await this.setControlValue("temperature", value);
					}),
			);
	}

	/** The declarative folder control needs 1.13, so older versions browse here. */
	private renderRolesFolder(containerEl: HTMLElement): void {
		new Setting(containerEl)
			.setName("Roles folder")
			.setDesc(
				"Every Markdown file in this folder becomes a role: the file name is the role name, the content its instructions.",
			)
			.addText((text) =>
				text
					.setPlaceholder("Modai roles")
					.setValue(this.plugin.settings.rolesFolder)
					.onChange(async (value) => {
						await this.setControlValue("rolesFolder", value);
					}),
			)
			.addButton((button) =>
				button.setButtonText("Browse").onClick(() => {
					new FolderSuggestModal(this.app, (folder) => {
						void this.setControlValue("rolesFolder", folder.path);
					}).open();
				}),
			);
	}

	/** Text value of a control key, ignoring anything unexpected. */
	private stringValue(key: string): string {
		const value = this.getControlValue(key);

		return typeof value === "string" ? value : "";
	}

	private providerOptions(): Record<string, string> {
		return Object.fromEntries(
			PROVIDER_IDS.map((id) => [id, PROVIDERS[id].label]),
		);
	}

	private modelOptions(): Record<string, string> {
		const models = PROVIDERS[this.plugin.settings.provider].models;

		return {
			...Object.fromEntries(
				models.map((model) => [model.id, model.label]),
			),
			[CUSTOM_MODEL]: "Custom model...",
		};
	}

	private isCustomModel(): boolean {
		return (
			this.customModel ||
			!isSuggestedModel(
				this.plugin.settings.provider,
				this.plugin.settings.model,
			)
		);
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
