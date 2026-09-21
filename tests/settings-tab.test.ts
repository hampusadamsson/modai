import { describe, expect, it, vi } from "vitest";
import type { Mock } from "vitest";
import type { App, SettingDefinitionItem } from "obsidian";
import {
	ModaiSettingsTab,
	PluginSettings,
	resolveSettings,
} from "../src/settings";

type PluginArg = ConstructorParameters<typeof ModaiSettingsTab>[1];

/** The tab's re-render call, typed as the mock the Obsidian mock installs. */
const tabMocks = (tab: ModaiSettingsTab) => tab as unknown as { update: Mock };

function createTab(
	stored: Partial<PluginSettings> = {},
	catalog: {
		models?: string[];
		loading?: boolean;
		error?: string | null;
		loaded?: boolean;
	} = {},
) {
	const listing = {
		models: catalog.models ?? [],
		loading: catalog.loading ?? false,
		error: catalog.error ?? null,
		loaded: catalog.loaded ?? true,
	};
	const plugin = {
		settings: resolveSettings(stored),
		roles: [{ name: "Author" }, { name: "Poet" }],
		saveSettings: vi.fn(async () => undefined),
		refreshRoles: vi.fn(async () => undefined),
		modelCatalog: () => listing,
		refreshModels: vi.fn(async () => undefined),
	};

	const tab = new ModaiSettingsTab({} as App, plugin as unknown as PluginArg);

	// Obsidian 1.13 and later ask for definitions first, which switches the tab
	// to the declarative path; older versions call display() instead.
	const definitions = tab.getSettingDefinitions();

	return { tab, plugin, definitions };
}

type Definitions = SettingDefinitionItem[];

type Leaf = SettingDefinitionItem & {
	name: string;
	desc?: string | DocumentFragment;
};

const isLeaf = (entry: unknown): entry is Leaf =>
	typeof entry === "object" && entry !== null && "name" in entry;

/** Every named definition, groups and lists flattened. */
const itemsOf = (definitions: Definitions): Leaf[] =>
	definitions.flatMap((entry) => {
		const nested =
			"items" in entry && Array.isArray(entry.items) ? entry.items : [];

		return [entry, ...nested].filter(isLeaf);
	});

const findItem = (definitions: Definitions, name: string) => {
	const item = itemsOf(definitions).find((entry) => entry.name === name);
	if (!item) throw new Error(`no setting named ${name}`);

	return item;
};

const controlOf = (definitions: Definitions, name: string) => {
	const item = findItem(definitions, name);

	return "control" in item ? item.control : undefined;
};

const visibleOf = (definitions: Definitions, name: string) => {
	const visible = findItem(definitions, name).visible;

	return typeof visible === "function" ? visible() : visible;
};

describe("setting definitions", () => {
	it("describes every setting with a control key", () => {
		const { definitions } = createTab();

		expect(definitions).toHaveLength(3);
		expect(itemsOf(definitions).map((item) => item.name)).toEqual([
			"Provider",
			"API key",
			"Base URL",
			"Temperature",
			"Model",
			"Custom model",
			"Refresh models",
			"Review items per pass",
			"Roles folder",
			"Roles found",
		]);
	});

	it("uses the native folder control for the roles folder", () => {
		const { definitions } = createTab();

		expect(controlOf(definitions, "Roles folder")).toMatchObject({
			type: "folder",
			key: "rolesFolder",
		});
	});

	it("offers the models the provider reported, plus a custom entry", () => {
		const { definitions } = createTab(
			{ provider: "gemini" },
			{ models: ["gemini-3-flash", "gemini-3-pro"] },
		);
		const control = controlOf(definitions, "Model");

		expect(control?.type).toBe("dropdown");
		if (control?.type !== "dropdown") throw new Error("not a dropdown");

		expect(Object.keys(control.options)).toEqual([
			"gemini-3-flash",
			"gemini-3-pro",
			"__custom__",
		]);
		expect(findItem(definitions, "Model").desc).toContain(
			"2 models from the provider",
		);
	});

	it("explains why the model list is missing", () => {
		const loading = createTab({}, { loading: true });
		const failed = createTab({}, { error: "401 from api.openai.com" });
		const empty = createTab({}, { models: [] });

		expect(findItem(loading.definitions, "Model").desc).toContain(
			"Reading the model list",
		);
		expect(findItem(failed.definitions, "Model").desc).toContain(
			"401 from api.openai.com",
		);
		expect(findItem(empty.definitions, "Model").desc).toContain(
			"listed no models",
		);
	});

	it("reads the list when the settings are shown", () => {
		const { plugin } = createTab({}, { loaded: false });

		expect(plugin.refreshModels).toHaveBeenCalled();
	});

	it("keeps the list it already has", () => {
		const { plugin } = createTab({}, { models: ["gpt-4o"], loaded: true });

		expect(plugin.refreshModels).not.toHaveBeenCalled();
	});

	it("shows the custom model field only for a custom model", () => {
		const listed = { models: ["gpt-4o", "gpt-5.2"] };
		const suggested = createTab(
			{ provider: "openai", model: "gpt-4o" },
			listed,
		);
		const custom = createTab(
			{ provider: "openai", model: "my-own-model" },
			listed,
		);

		expect(visibleOf(suggested.definitions, "Custom model")).toBe(false);
		expect(visibleOf(custom.definitions, "Custom model")).toBe(true);
	});

	it("lists the roles that were found", () => {
		const { definitions } = createTab();

		expect(findItem(definitions, "Roles found").desc).toBe("Author, Poet");
	});
});

describe("control values", () => {
	it("reads the stored settings", () => {
		const { tab } = createTab(
			{
				provider: "ollama",
				model: "llama3.1:8b",
				temperature: 0.3,
				rolesFolder: "Modai roles",
				apiKey: "token",
				baseUrl: "http://box:11434/v1",
			},
			{ models: ["llama3.1:8b", "qwen3:32b"] },
		);

		expect(tab.getControlValue("provider")).toBe("ollama");
		expect(tab.getControlValue("modelChoice")).toBe("llama3.1:8b");
		expect(tab.getControlValue("temperature")).toBe(0.3);
		expect(tab.getControlValue("rolesFolder")).toBe("Modai roles");
		expect(tab.getControlValue("apiKey")).toBe("token");
		expect(tab.getControlValue("baseUrl")).toBe("http://box:11434/v1");
		expect(tab.getControlValue("nonsense")).toBeUndefined();
	});

	it("shows the custom entry when the model is not suggested", () => {
		const { tab } = createTab({ model: "brand-new-model" });

		expect(tab.getControlValue("modelChoice")).toBe("__custom__");
		expect(tab.getControlValue("model")).toBe("brand-new-model");
	});
});

describe("changing controls", () => {
	it("keeps the model and reloads the list when the provider changes", async () => {
		const { tab, plugin } = createTab({
			provider: "openai",
			model: "gpt-4o",
		});

		await tab.setControlValue("provider", "gemini");

		expect(plugin.settings.provider).toBe("gemini");
		expect(plugin.settings.model).toBe("gpt-4o");
		expect(plugin.saveSettings).toHaveBeenCalled();
		expect(plugin.refreshModels).toHaveBeenCalled();
		expect(tabMocks(tab).update).toHaveBeenCalled();
	});

	it("ignores a provider it does not know", async () => {
		const { tab, plugin } = createTab({ provider: "openai" });

		await tab.setControlValue("provider", "not-a-provider");

		expect(plugin.settings.provider).toBe("openai");
		expect(plugin.saveSettings).not.toHaveBeenCalled();
	});

	it("switches between a listed and a custom model", async () => {
		const { tab, plugin } = createTab(
			{ provider: "openai" },
			{
				models: ["gpt-4o", "gpt-5.2"],
			},
		);

		await tab.setControlValue("modelChoice", "__custom__");
		expect(tab.getControlValue("modelChoice")).toBe("__custom__");

		await tab.setControlValue("model", "my-own-model");
		expect(plugin.settings.model).toBe("my-own-model");

		await tab.setControlValue("modelChoice", "gpt-4o");
		expect(plugin.settings.model).toBe("gpt-4o");
		expect(tab.getControlValue("modelChoice")).toBe("gpt-4o");
	});

	it("reloads the roles when the folder changes", async () => {
		const { tab, plugin } = createTab({ rolesFolder: "Modai roles" });

		await tab.setControlValue("rolesFolder", "Writing/roles");

		expect(plugin.settings.rolesFolder).toBe("Writing/roles");
		expect(plugin.refreshRoles).toHaveBeenCalledTimes(1);

		await tab.setControlValue("rolesFolder", "Writing/roles");
		expect(plugin.refreshRoles).toHaveBeenCalledTimes(1);
	});

	it("stores the temperature, the token and the endpoint", async () => {
		const { tab, plugin } = createTab();

		await tab.setControlValue("temperature", 0.2);
		await tab.setControlValue("apiKey", "sk-2");
		await tab.setControlValue("baseUrl", "http://box:11434/v1");

		expect(plugin.settings).toMatchObject({
			temperature: 0.2,
			apiKey: "sk-2",
			baseUrl: "http://box:11434/v1",
		});
	});

	it("ignores values of the wrong type", async () => {
		const { tab, plugin } = createTab();

		await tab.setControlValue("temperature", "warm");
		await tab.setControlValue("model", 7);
		await tab.setControlValue("openAIKey", null);
		await tab.setControlValue("unknown", "value");

		expect(plugin.settings).toEqual(resolveSettings({ rolesFolder: "" }));
		expect(plugin.saveSettings).not.toHaveBeenCalled();
	});
});
