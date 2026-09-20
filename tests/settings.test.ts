import { describe, expect, it } from "vitest";
import {
	DEFAULT_SETTINGS,
	PluginSettings,
	resolveSettings,
} from "../src/settings";
import { createProvider } from "../src/providers/factory";
import { isSuggestedModel } from "../src/providers/registry";

describe("default settings", () => {
	it("routes the default settings to a supported provider", () => {
		expect(() => createProvider(DEFAULT_SETTINGS)).not.toThrow();
	});

	it("suggests the default model for the default provider", () => {
		expect(
			isSuggestedModel(DEFAULT_SETTINGS.provider, DEFAULT_SETTINGS.model),
		).toBe(true);
	});

	it("keeps temperature inside the range offered by the settings slider", () => {
		expect(DEFAULT_SETTINGS.temperature).toBeGreaterThanOrEqual(0.1);
		expect(DEFAULT_SETTINGS.temperature).toBeLessThanOrEqual(1);
	});

	it("requires the user to supply cloud credentials", () => {
		expect(DEFAULT_SETTINGS.openAIKey).toBe("");
		expect(DEFAULT_SETTINGS.geminiAIKey).toBe("");
	});

	it("points Ollama at the local server", () => {
		expect(DEFAULT_SETTINGS.llamaBaseUrl).toBe("http://localhost:11434");
	});

	it("starts without a roles folder", () => {
		expect(DEFAULT_SETTINGS.rolesFolder).toBe("");
	});
});

describe("resolveSettings", () => {
	it("falls back to the defaults when nothing is stored", () => {
		expect(resolveSettings(null)).toEqual(DEFAULT_SETTINGS);
	});

	it("prefers stored values over the defaults", () => {
		const settings = resolveSettings({
			model: "llama3.1:8b",
			temperature: 0.2,
			rolesFolder: "Modai roles",
		});

		expect(settings.model).toBe("llama3.1:8b");
		expect(settings.temperature).toBe(0.2);
		expect(settings.rolesFolder).toBe("Modai roles");
	});

	it("drops the inline roles older versions stored", () => {
		const stored = {
			roles: { Author: "write a book" },
		} as unknown as Partial<PluginSettings>;

		expect(resolveSettings(stored)).not.toHaveProperty("roles");
	});

	it("does not hand out the default object itself", () => {
		const settings = resolveSettings(null);
		settings.rolesFolder = "elsewhere";

		expect(DEFAULT_SETTINGS.rolesFolder).toBe("");
	});
});

describe("provider migration", () => {
	it("keeps a provider chosen in the settings", () => {
		expect(
			resolveSettings({ provider: "llama", model: "gpt-4o" }),
		).toMatchObject({ provider: "llama", model: "gpt-4o" });
	});

	it("infers the provider from the model of older settings", () => {
		expect(resolveSettings({ model: "gpt-4o" }).provider).toBe("openai");
		expect(resolveSettings({ model: "gemini-2.5-flash" }).provider).toBe(
			"gemini",
		);
		expect(resolveSettings({ model: "llama3.1:8b" }).provider).toBe(
			"llama",
		);
	});

	it("falls back to the default provider for an unfamiliar model", () => {
		expect(resolveSettings({ model: "some-future-model" }).provider).toBe(
			DEFAULT_SETTINGS.provider,
		);
	});

	it("replaces a provider id it does not know", () => {
		// data.json is user-editable, so anything can show up here.
		const stored = {
			provider: "mistral",
			model: "gemini-3-pro",
		} as unknown as Partial<PluginSettings>;

		expect(resolveSettings(stored).provider).toBe("gemini");
	});
});
