import { describe, expect, it } from "vitest";
import { Gemini } from "../../src/providers/gemini";
import {
	lastRequest,
	requestUrlMock,
	respondWith,
	sentBody,
} from "../helpers/request-url";

const call = (model = "gemini-2.5-flash") =>
	new Gemini("gemini-key").call("rewrite this", model, 0.4);

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
			"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=gemini-key",
		);
		expect(request.method).toBe("POST");
		expect(sentBody(request)).toEqual({
			contents: [{ parts: [{ text: "rewrite this" }] }],
			generationConfig: { temperature: 0.4 },
		});
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
