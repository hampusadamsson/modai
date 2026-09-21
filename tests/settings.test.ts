import { describe, expect, it } from "vitest";
import {
	DEFAULT_SETTINGS,
	PluginSettings,
	resolveSettings,
} from "../src/settings";
import { createProvider } from "../src/providers/factory";

describe("default settings", () => {
	it("routes the default settings to a supported provider", () => {
		expect(() => createProvider(DEFAULT_SETTINGS)).not.toThrow();
	});

	it("assumes no model: the provider's list decides", () => {
		expect(DEFAULT_SETTINGS.model).toBe("");
	});

	it("keeps temperature inside the range offered by the settings slider", () => {
		expect(DEFAULT_SETTINGS.temperature).toBeGreaterThanOrEqual(0.1);
		expect(DEFAULT_SETTINGS.temperature).toBeLessThanOrEqual(1);
	});

	it("starts with one empty token and no endpoint override", () => {
		expect(DEFAULT_SETTINGS.apiKey).toBe("");
		expect(DEFAULT_SETTINGS.baseUrl).toBe("");
	});

	it("asks for a handful of review items per pass", () => {
		expect(DEFAULT_SETTINGS.chunkSize).toBe(5);
		expect(resolveSettings({ chunkSize: 12 }).chunkSize).toBe(12);
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
			provider: "groq",
			apiKey: "token",
			baseUrl: "http://box:1234/v1",
			model: "llama3.1:8b",
			temperature: 0.2,
			rolesFolder: "Modai roles",
		});

		expect(settings).toMatchObject({
			provider: "groq",
			apiKey: "token",
			baseUrl: "http://box:1234/v1",
			model: "llama3.1:8b",
			temperature: 0.2,
			rolesFolder: "Modai roles",
		});
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

describe("migration from per-provider settings", () => {
	it("keeps the token that belongs to the selected provider", () => {
		expect(
			resolveSettings({ provider: "openai", openAIKey: "sk-old" }).apiKey,
		).toBe("sk-old");
		expect(
			resolveSettings({ provider: "gemini", geminiAIKey: "gm-old" })
				.apiKey,
		).toBe("gm-old");
	});

	it("moves the local model settings to the Ollama provider", () => {
		// `llama` was the provider id before the list grew.
		const settings = resolveSettings({
			provider: "llama",
			llamaAIKey: "ollama",
			llamaBaseUrl: "http://box:11434",
		} as unknown as Partial<PluginSettings>);

		expect(settings).toMatchObject({
			provider: "ollama",
			apiKey: "ollama",
			baseUrl: "http://box:11434",
		});
	});

	it("leaves the endpoint override empty for cloud providers", () => {
		expect(
			resolveSettings({ provider: "openai", llamaBaseUrl: "http://box" })
				.baseUrl,
		).toBe("");
	});

	it("prefers the single token and endpoint over the old keys", () => {
		const settings = resolveSettings({
			provider: "openai",
			apiKey: "new",
			baseUrl: "http://new",
			openAIKey: "old",
			llamaBaseUrl: "http://old",
		});

		expect(settings).toMatchObject({
			apiKey: "new",
			baseUrl: "http://new",
		});
	});

	it("infers the token from the model when no provider was stored", () => {
		expect(
			resolveSettings({ model: "gemini-2.5-flash", geminiAIKey: "gm" })
				.apiKey,
		).toBe("gm");
	});
});

describe("provider migration", () => {
	it("keeps a provider chosen in the settings", () => {
		expect(
			resolveSettings({ provider: "opencode", model: "kimi-k3" }),
		).toMatchObject({ provider: "opencode", model: "kimi-k3" });
	});

	it("infers the provider from the model of older settings", () => {
		expect(resolveSettings({ model: "gpt-4o" }).provider).toBe("openai");
		expect(resolveSettings({ model: "gemini-2.5-flash" }).provider).toBe(
			"gemini",
		);
		// Local models used to be the "llama" provider, now Ollama.
		expect(resolveSettings({ model: "llama3.1:8b" }).provider).toBe(
			"ollama",
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
			provider: "not-a-provider",
			model: "gemini-3-pro",
		} as unknown as Partial<PluginSettings>;

		expect(resolveSettings(stored).provider).toBe("gemini");
	});
});
