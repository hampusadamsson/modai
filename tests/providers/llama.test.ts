import { describe, expect, it } from "vitest";
import { Llama } from "../../src/providers/llama";
import { lastRequest, respondWith, sentBody } from "../helpers/request-url";

describe("Llama (Ollama-compatible) provider", () => {
	it("defaults to the local Ollama server", async () => {
		respondWith({
			json: { choices: [{ message: { content: " improved " } }] },
		});

		const result = await new Llama().call(
			"rewrite this",
			"llama3.1:8b",
			0.4,
		);

		expect(result).toBe("improved");

		const request = lastRequest();
		expect(request.url).toBe("http://127.0.0.1:11434/v1/chat/completions");
		expect(request.headers?.Authorization).toBe("Bearer ollama");
		expect(sentBody(request)).toEqual({
			model: "llama3.1:8b",
			messages: [{ role: "user", content: "rewrite this" }],
			temperature: 0.4,
			stream: false,
		});
	});

	it("uses the configured server and key", async () => {
		respondWith({ json: { choices: [{ message: { content: "ok" } }] } });

		await new Llama("custom-key", "http://ollama.internal:11434").call(
			"rewrite this",
			"llama3.1:8b",
			0.4,
		);

		const request = lastRequest();
		expect(request.url).toBe(
			"http://ollama.internal:11434/v1/chat/completions",
		);
		expect(request.headers?.Authorization).toBe("Bearer custom-key");
	});

	it("reports the HTTP status when the server returns no content", async () => {
		respondWith({ json: {}, status: 404 });

		await expect(
			new Llama().call("rewrite this", "missing-model", 0.4),
		).rejects.toThrow("No response content. Status: 404");
	});
});
