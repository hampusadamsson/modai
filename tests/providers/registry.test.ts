import { describe, expect, it } from "vitest";
import {
	PROVIDERS,
	PROVIDER_IDS,
	isProviderId,
	isSuggestedModel,
	providerForModel,
} from "../../src/providers/registry";

describe("provider registry", () => {
	it("describes every provider it lists", () => {
		for (const id of PROVIDER_IDS) {
			const info = PROVIDERS[id];

			expect(info.id).toBe(id);
			expect(info.label.trim()).not.toBe("");
			expect(info.models.length).toBeGreaterThan(0);
		}
	});

	it("suggests each provider's default model", () => {
		for (const id of PROVIDER_IDS) {
			expect(isSuggestedModel(id, PROVIDERS[id].defaultModel)).toBe(true);
		}
	});

	it("keeps the suggested model ids unique and labelled", () => {
		for (const id of PROVIDER_IDS) {
			const models = PROVIDERS[id].models;

			expect(new Set(models.map((model) => model.id)).size).toBe(
				models.length,
			);
			for (const model of models) {
				expect(model.id.trim()).not.toBe("");
				expect(model.label.trim()).not.toBe("");
			}
		}
	});

	it("recognises provider ids and rejects anything else", () => {
		for (const id of PROVIDER_IDS) {
			expect(isProviderId(id)).toBe(true);
		}

		expect(isProviderId("mistral")).toBe(false);
		expect(isProviderId("")).toBe(false);
		expect(isProviderId(undefined)).toBe(false);
		expect(isProviderId(null)).toBe(false);
	});

	it("infers the provider from a model name saved before it was selectable", () => {
		expect(providerForModel("gpt-4o")).toBe("openai");
		expect(providerForModel("gemini-2.5-flash")).toBe("gemini");
		expect(providerForModel("llama3.1:8b")).toBe("llama");
		expect(providerForModel("some-future-model")).toBe("openai");
	});
});
