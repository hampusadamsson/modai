import { describe, expect, it } from "vitest";
import { ChatGPT } from "../../src/providers/chatgpt";
import {
	lastRequest,
	requestUrlMock,
	respondWith,
	sentBody,
} from "../helpers/request-url";

const call = (model = "gpt-4o") =>
	new ChatGPT("sk-secret").call("rewrite this", model, 0.4);

describe("ChatGPT provider", () => {
	it("posts the prompt to the OpenAI chat completions endpoint", async () => {
		respondWith({
			json: { choices: [{ message: { content: " improved " } }] },
		});

		await expect(call("gpt-4o-mini")).resolves.toBe("improved");

		const request = lastRequest();
		expect(request.url).toBe("https://api.openai.com/v1/chat/completions");
		expect(request.method).toBe("POST");
		expect(request.headers?.Authorization).toBe("Bearer sk-secret");
		expect(request.headers?.["Content-Type"]).toBe("application/json");
		expect(sentBody(request)).toEqual({
			model: "gpt-4o-mini",
			messages: [{ role: "user", content: "rewrite this" }],
			temperature: 0.4,
		});
	});

	it("fails with the raw response text when no completion is returned", async () => {
		respondWith({ json: {}, text: "rate limited", status: 429 });

		await expect(call()).rejects.toThrow("rate limited");
	});

	it("propagates the message of a failed request", async () => {
		requestUrlMock.mockRejectedValue(new Error("network down"));

		await expect(call()).rejects.toThrow("network down");
	});

	it("stringifies non-Error failures", async () => {
		requestUrlMock.mockRejectedValue("socket hang up");

		await expect(call()).rejects.toThrow("socket hang up");
	});

	it("keeps the underlying failure as the cause", async () => {
		const cause = new Error("network down");
		requestUrlMock.mockRejectedValue(cause);

		const error = await call().catch((reason: unknown) => reason);

		expect(error).toBeInstanceOf(Error);
		expect((error as Error).cause).toBe(cause);
	});
});
