import { describe, expect, it } from "vitest";
import { createProvider } from "../../src/providers/factory";
import { ChatGPT } from "../../src/providers/chatgpt";
import { Gemini } from "../../src/providers/gemini";
import { Llama } from "../../src/providers/llama";
import { ProviderId } from "../../src/providers/registry";

const config = {
	provider: "openai" as ProviderId,
	model: "gpt-4o",
	openAIKey: "openai-key",
	geminiAIKey: "gemini-key",
	llamaAIKey: "llama-key",
	llamaBaseUrl: "http://localhost:11434",
};

describe("provider factory", () => {
	it("selects the provider chosen in the settings", () => {
		expect(createProvider(config)).toBeInstanceOf(ChatGPT);
		expect(
			createProvider({ ...config, provider: "gemini" }),
		).toBeInstanceOf(Gemini);
		expect(createProvider({ ...config, provider: "llama" })).toBeInstanceOf(
			Llama,
		);
	});

	it("passes the credentials of the selected provider", () => {
		expect(createProvider(config)).toMatchObject({ apiKey: "openai-key" });
		expect(createProvider({ ...config, provider: "gemini" })).toMatchObject(
			{ apiKey: "gemini-key" },
		);
		expect(createProvider({ ...config, provider: "llama" })).toMatchObject({
			apiKey: "llama-key",
			baseUrl: "http://localhost:11434",
		});
	});

	it("accepts any model id with any provider", () => {
		// The model no longer decides the provider, so a provider-specific
		// prefix or an id the plugin has never heard of both work.
		expect(
			createProvider({ ...config, model: "gemini-2.5-flash" }),
		).toBeInstanceOf(ChatGPT);
		expect(
			createProvider({
				...config,
				provider: "llama",
				model: "qwen3:32b",
			}),
		).toBeInstanceOf(Llama);
		expect(
			createProvider({
				...config,
				provider: "gemini",
				model: "gemma-4-99b",
			}),
		).toBeInstanceOf(Gemini);
	});

	it("rejects a provider it does not implement", () => {
		const provider = "mistral" as unknown as ProviderId;

		expect(() => createProvider({ ...config, provider })).toThrow(
			"Unknown provider: mistral",
		);
	});
});
