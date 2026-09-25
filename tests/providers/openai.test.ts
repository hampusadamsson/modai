import { afterEach, describe, expect, it, vi } from "vitest";
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

	describe("streaming shape", () => {
		const streamCall = (
			provider = new OpenAICompatible(
				"https://api.example.com/v1",
				"secret",
				{},
				{ stream: true, sendTemperature: false },
			),
		) => provider.call("rewrite this", "some-model", 0.4);

		it("sends stream without temperature", async () => {
			respondWith({
				json: {},
				text: 'data: {"choices":[{"delta":{"content":"ok"}}]}\ndata: [DONE]\n',
			});

			await expect(streamCall()).resolves.toBe("ok");

			expect(sentBody(lastRequest())).toEqual({
				model: "some-model",
				messages: [{ role: "user", content: "rewrite this" }],
				stream: true,
				stream_options: { include_usage: true },
			});
		});

		it("concatenates the SSE chunks", async () => {
			// No `json` field: the getter would throw on an event stream.
			respondWith({
				text: 'data: {"choices":[{"delta":{"content":"hel"}}]}\n\ndata: {"choices":[{"delta":{"content":"lo"}}]}\ndata: [DONE]\n',
			});

			await expect(streamCall()).resolves.toBe("hello");
		});
	});

	describe("fetch transport", () => {
		afterEach(() => {
			vi.unstubAllGlobals();
		});

		it("never touches fetch when requestUrl succeeds", async () => {
			vi.stubGlobal("window", {});
			const fetchMock = vi.fn(async () => {
				throw new TypeError("Failed to fetch");
			});
			vi.stubGlobal("fetch", fetchMock);
			respondWith({
				json: { choices: [{ message: { content: "quiet" } }] },
			});

			await expect(call()).resolves.toBe("quiet");
			expect(fetchMock).not.toHaveBeenCalled();
		});

		it("rescues the gateway error body when requestUrl fails", async () => {
			vi.stubGlobal("window", {});
			vi.stubGlobal(
				"fetch",
				vi.fn(async () => ({
					ok: false,
					status: 400,
					text: async () =>
						'{"error":{"message":"temperature not supported"}}',
				})),
			);
			requestUrlMock.mockRejectedValue(new Error("Request failed"));

			await expect(call()).rejects.toThrow(
				'400 {"error":{"message":"temperature not supported"}}',
			);
		});

		it("keeps the original failure when fetch cannot run", async () => {
			vi.stubGlobal("window", {});
			vi.stubGlobal(
				"fetch",
				vi.fn(async () => {
					throw new TypeError("Failed to fetch");
				}),
			);
			requestUrlMock.mockRejectedValue(new Error("Request failed"));

			await expect(call()).rejects.toThrow("Request failed");
		});
	});
});
