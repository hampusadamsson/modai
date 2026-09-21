import { describe, expect, it } from "vitest";
import { createProvider } from "../../src/providers/factory";
import { Gemini } from "../../src/providers/gemini";
import { OpenAICompatible } from "../../src/providers/openai";
import { PROVIDER_IDS, ProviderId } from "../../src/providers/registry";

const config = {
	provider: "openai" as ProviderId,
	apiKey: "token",
	baseUrl: "",
};

describe("provider factory", () => {
	it("builds an OpenAI compatible client for that dialect", () => {
		const provider = createProvider(config);

		expect(provider).toBeInstanceOf(OpenAICompatible);
		expect(provider).toMatchObject({
			baseUrl: "https://api.openai.com/v1",
			apiKey: "token",
		});
	});

	it("builds a Gemini client for its own API shape", () => {
		const provider = createProvider({ ...config, provider: "gemini" });

		expect(provider).toBeInstanceOf(Gemini);
		expect(provider).toMatchObject({
			baseUrl: "https://generativelanguage.googleapis.com/v1beta",
			apiKey: "token",
		});
	});

	it("builds a client for every provider that has an endpoint", () => {
		for (const provider of PROVIDER_IDS) {
			if (provider === "custom") continue;

			expect(createProvider({ ...config, provider })).toBeDefined();
		}
	});

	it("uses the local Ollama URL by default", () => {
		expect(createProvider({ ...config, provider: "ollama" })).toMatchObject(
			{
				baseUrl: "http://localhost:11434/v1",
			},
		);
	});

	it("lets the endpoint override win", () => {
		expect(
			createProvider({
				...config,
				provider: "groq",
				baseUrl: " http://box:1234/v1/ ",
			}),
		).toMatchObject({ baseUrl: "http://box:1234/v1" });
	});

	it("asks for a URL when the provider has no endpoint of its own", () => {
		expect(() => createProvider({ ...config, provider: "custom" })).toThrow(
			"Set a base URL",
		);
	});

	it("rejects a provider it does not know", () => {
		const provider = "nope" as unknown as ProviderId;

		expect(() => createProvider({ ...config, provider })).toThrow(
			"Unknown provider: nope",
		);
	});
});
