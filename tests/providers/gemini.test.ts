import { describe, expect, it } from "vitest";
import { Gemini } from "../../src/providers/gemini";
import {
	lastRequest,
	requestUrlMock,
	respondWith,
	sentBody,
} from "../helpers/request-url";

const ENDPOINT = "https://generativelanguage.googleapis.com/v1beta";

const call = (
	provider = new Gemini("gemini-key", ENDPOINT),
	model = "gemini-2.5-flash",
) => provider.call("rewrite this", model, 0.4);

describe("Gemini provider", () => {
	it("calls generateContent with the model and key in the URL", async () => {
		respondWith({
			json: {
				candidates: [{ content: { parts: [{ text: " improved " }] } }],
			},
		});

		await expect(call()).resolves.toBe("improved");

		const request = lastRequest();
		expect(request.url).toBe(
			`${ENDPOINT}/models/gemini-2.5-flash:generateContent?key=gemini-key`,
		);
		expect(request.method).toBe("POST");
		expect(sentBody(request)).toEqual({
			contents: [{ parts: [{ text: "rewrite this" }] }],
			generationConfig: { temperature: 0.4 },
		});
	});

	it("uses an endpoint override", async () => {
		respondWith({
			json: { candidates: [{ content: { parts: [{ text: "ok" }] } }] },
		});

		await call(new Gemini("key", "https://proxy.example.com/v1beta"));

		expect(lastRequest().url).toBe(
			"https://proxy.example.com/v1beta/models/gemini-2.5-flash:generateContent?key=key",
		);
	});

	it("reports the reason when a prompt is blocked by safety filters", async () => {
		respondWith({ json: { promptFeedback: { blockReason: "SAFETY" } } });

		await expect(call()).rejects.toThrow(
			"Blocked by safety filters: SAFETY",
		);
	});

	it("reports an empty or unexpected response", async () => {
		respondWith({ json: { candidates: [{ content: { parts: [{}] } }] } });

		await expect(call()).rejects.toThrow(
			"Empty response or unexpected format from Gemini",
		);
	});

	it("propagates the message of a failed request", async () => {
		requestUrlMock.mockRejectedValue(new Error("quota exceeded"));

		await expect(call()).rejects.toThrow("quota exceeded");
	});
});
