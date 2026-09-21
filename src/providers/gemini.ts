import { requestUrl } from "obsidian";
import { provider } from "./base";

interface GeminiResponse {
	candidates?: GeminiCandidate[];
	promptFeedback?: {
		blockReason?: string;
	};
}

interface GeminiCandidate {
	content: {
		parts: GeminiPart[];
		role: "model";
	};
	finishReason?: string;
	index?: number;
}

interface GeminiPart {
	text?: string;
	inlineData?: {
		mimeType: string;
		data: string;
	};
}

/** Google's own API shape, which differs from the OpenAI compatible ones. */
export class Gemini implements provider {
	apiKey: string;
	baseUrl: string;

	constructor(apiKey: string, baseUrl: string) {
		this.apiKey = apiKey;
		this.baseUrl = baseUrl;
	}

	async call(
		message: string,
		model: string,
		temperature: number,
	): Promise<string> {
		try {
			const response = await requestUrl({
				url: `${this.baseUrl}/models/${model}:generateContent?key=${this.apiKey}`,
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					contents: [
						{
							parts: [{ text: message }],
						},
					],
					generationConfig: {
						temperature: temperature,
					},
				}),
			});

			const result = response.json as GeminiResponse;

			const text =
				result.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

			if (!text) {
				if (result.promptFeedback?.blockReason) {
					throw new Error(
						`Blocked by safety filters: ${result.promptFeedback.blockReason}`,
					);
				}
				throw new Error(
					"Empty response or unexpected format from Gemini",
				);
			}

			return text;
		} catch (error) {
			console.error("Modai: Gemini request failed", error);
			throw new Error(
				error instanceof Error ? error.message : String(error),
				{ cause: error },
			);
		}
	}
}
