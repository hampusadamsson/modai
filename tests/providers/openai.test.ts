import { describe, expect, it } from "vitest";
import { OpenAICompatible } from "../../src/providers/openai";
import {
	lastRequest,
	requestUrlMock,
	respondWith,
	sentBody,
} from "../helpers/request-url";

const call = (
	provider = new OpenAICompatible("https://api.example.com/v1", "secret"),
) => provider.call("rewrite this", "some-model", 0.4);

describe("OpenAI compatible provider", () => {
	it("posts the prompt to chat completions on the configured endpoint", async () => {
		respondWith({
			json: { choices: [{ message: { content: " improved " } }] },
		});

		await expect(call()).resolves.toBe("improved");

		const request = lastRequest();
		expect(request.url).toBe("https://api.example.com/v1/chat/completions");
		expect(request.method).toBe("POST");
		expect(request.headers?.Authorization).toBe("Bearer secret");
		expect(request.headers?.["Content-Type"]).toBe("application/json");
		expect(sentBody(request)).toEqual({
			model: "some-model",
			messages: [{ role: "user", content: "rewrite this" }],
			temperature: 0.4,
		});
	});

	it("works with a local server, which needs no token", async () => {
		respondWith({ json: { choices: [{ message: { content: "ok" } }] } });

		await new OpenAICompatible("http://localhost:11434/v1", "").call(
			"hi",
			"llama3.1:8b",
			0.7,
		);

		expect(lastRequest().url).toBe(
			"http://localhost:11434/v1/chat/completions",
		);
		expect(lastRequest().headers).not.toHaveProperty("Authorization");
	});

	it("reports the status and the body when no completion came back", async () => {
		respondWith({ json: {}, text: "rate limited", status: 429 });

		await expect(call()).rejects.toThrow("429 rate limited");
	});

	it("propagates the failure message and keeps the cause", async () => {
		const cause = new Error("network down");
		requestUrlMock.mockRejectedValue(cause);

		const error = await call().catch((reason: unknown) => reason);

		expect(error).toBeInstanceOf(Error);
		expect((error as Error).message).toContain("network down");
		expect((error as Error).message).toContain(
			"https://api.example.com/v1/chat/completions",
		);
		expect((error as Error).cause).toBe(cause);
	});

	it("stringifies non-Error failures", async () => {
		requestUrlMock.mockRejectedValue("socket hang up");

		await expect(call()).rejects.toThrow("socket hang up");
	});
});
