import { describe, expect, it } from "vitest";
import {
	fetchModels,
	modelsUrl,
	parseModelIds,
} from "../../src/providers/models";
import {
	lastRequest,
	requestUrlMock,
	respondWith,
} from "../helpers/request-url";

const OPENAI_LIST = {
	data: [
		{ id: "gpt-5.2" },
		{ id: "gpt-5.2" },
		{ id: "gpt-4o" },
		{ object: "model" },
	],
};

const GEMINI_LIST = {
	models: [
		{ name: "models/gemini-2.5-flash" },
		{ name: "models/gemini-2.5-pro" },
		{ name: "models/gemini-2.5-flash" },
	],
};

describe("modelsUrl", () => {
	it("asks the configured endpoint", () => {
		expect(modelsUrl("openai", "", "sk")).toBe(
			"https://api.openai.com/v1/models",
		);
		expect(modelsUrl("groq", "http://box:1234/v1", "sk")).toBe(
			"http://box:1234/v1/models",
		);
	});

	it("passes the key in the URL for Gemini, which needs it there", () => {
		expect(modelsUrl("gemini", "", "gemini-key")).toBe(
			"https://generativelanguage.googleapis.com/v1beta/models?key=gemini-key",
		);
	});
});

describe("parseModelIds", () => {
	it("reads the OpenAI shape, sorted without duplicates", () => {
		expect(parseModelIds("openai", OPENAI_LIST)).toEqual([
			"gpt-4o",
			"gpt-5.2",
		]);
	});

	it("reads the Gemini shape and drops its prefix", () => {
		expect(parseModelIds("gemini", GEMINI_LIST)).toEqual([
			"gemini-2.5-flash",
			"gemini-2.5-pro",
		]);
	});

	it("returns nothing for payloads it does not understand", () => {
		expect(parseModelIds("openai", null)).toEqual([]);
		expect(parseModelIds("openai", "nope")).toEqual([]);
		expect(parseModelIds("openai", { data: "nope" })).toEqual([]);
		expect(parseModelIds("gemini", OPENAI_LIST)).toEqual([]);
	});
});

describe("fetchModels", () => {
	const config = { provider: "openai" as const, apiKey: "sk", baseUrl: "" };

	it("returns the models the provider reported", async () => {
		respondWith({ json: OPENAI_LIST, status: 200 });

		await expect(fetchModels(config)).resolves.toEqual({
			models: ["gpt-4o", "gpt-5.2"],
			error: null,
		});
		expect(lastRequest().headers?.Authorization).toBe("Bearer sk");
	});

	it("leaves the header out when there is no token", async () => {
		respondWith({ json: OPENAI_LIST, status: 200 });

		await fetchModels({ ...config, provider: "ollama", apiKey: "" });

		expect(lastRequest().url).toBe("http://localhost:11434/v1/models");
		expect(lastRequest().headers).not.toHaveProperty("Authorization");
	});

	it("reports the status when the provider rejects the request", async () => {
		respondWith({ json: { error: "unauthorized" }, status: 401 });

		const result = await fetchModels(config);

		expect(result.models).toEqual([]);
		expect(result.error).toBe("401 from api.openai.com");
	});

	it("reports a provider that lists nothing", async () => {
		respondWith({ json: {}, status: 200 });

		const result = await fetchModels(config);

		expect(result.models).toEqual([]);
		expect(result.error).toContain("did not list any models");
	});

	it("reports a request that never arrived", async () => {
		requestUrlMock.mockRejectedValue(new Error("network down"));

		const result = await fetchModels(config);

		expect(result).toEqual({ models: [], error: "network down" });
	});

	it("has nothing to ask when no endpoint is configured", async () => {
		const result = await fetchModels({
			provider: "custom",
			apiKey: "",
			baseUrl: "",
		});

		expect(result).toEqual({
			models: [],
			error: "No endpoint configured.",
		});
	});
});
