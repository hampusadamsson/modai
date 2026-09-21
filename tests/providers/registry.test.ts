import { describe, expect, it } from "vitest";
import {
	PROVIDERS,
	PROVIDER_IDS,
	isProviderId,
	migrateProviderId,
	providerForModel,
	resolveBaseUrl,
} from "../../src/providers/registry";

describe("provider registry", () => {
	it("offers a big list of providers", () => {
		expect(PROVIDER_IDS.length).toBeGreaterThan(30);

		for (const id of [
			"openai",
			"anthropic",
			"gemini",
			"opencode",
			"openrouter",
			"mistral",
			"groq",
			"deepseek",
			"xai",
			"ollama",
			"lmstudio",
			"custom",
		] as const) {
			expect(isProviderId(id)).toBe(true);
		}
	});

	it("labels every provider", () => {
		for (const id of PROVIDER_IDS) {
			expect(PROVIDERS[id].label.trim()).not.toBe("");
		}
	});

	it("gives every provider an endpoint, except the custom one", () => {
		for (const id of PROVIDER_IDS) {
			const { baseUrl } = PROVIDERS[id];

			if (id === "custom") {
				expect(baseUrl).toBe("");
				continue;
			}

			expect(baseUrl).toMatch(/^https?:\/\//);
			expect(baseUrl.endsWith("/")).toBe(false);
		}
	});

	it("only uses dialects the plugin implements", () => {
		for (const id of PROVIDER_IDS) {
			expect(["openai", "gemini"]).toContain(PROVIDERS[id].dialect);
		}
	});

	it("recognises provider ids and rejects anything else", () => {
		expect(isProviderId("mistral")).toBe(true);
		expect(isProviderId("llama")).toBe(false);
		expect(isProviderId("")).toBe(false);
		expect(isProviderId(null)).toBe(false);
	});
});

describe("provider migration", () => {
	it("maps the ids that were renamed", () => {
		expect(migrateProviderId("llama")).toBe("ollama");
		expect(migrateProviderId("openai")).toBe("openai");
		expect(migrateProviderId("gemini")).toBe("gemini");
		expect(migrateProviderId("nope")).toBeNull();
		expect(migrateProviderId(undefined)).toBeNull();
	});

	it("infers the provider from a model name saved before it was selectable", () => {
		expect(providerForModel("gpt-4o")).toBe("openai");
		expect(providerForModel("gemini-2.5-flash")).toBe("gemini");
		expect(providerForModel("llama3.1:8b")).toBe("ollama");
		expect(providerForModel("some-future-model")).toBe("openai");
	});
});

describe("resolveBaseUrl", () => {
	it("falls back to the provider's default", () => {
		expect(resolveBaseUrl("openai", "")).toBe("https://api.openai.com/v1");
		expect(resolveBaseUrl("ollama", "   ")).toBe(
			"http://localhost:11434/v1",
		);
	});

	it("prefers the override and trims it", () => {
		expect(resolveBaseUrl("openai", " http://box:1234/v1/ ")).toBe(
			"http://box:1234/v1",
		);
	});

	it("has nothing to fall back to for a custom endpoint", () => {
		expect(resolveBaseUrl("custom", "")).toBe("");
	});
});
