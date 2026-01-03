import { requestUrl } from "obsidian";
import { provider } from "./base";

interface OpenAIResponse {
	choices?: {
		message?: {
			content?: string;
		};
	}[];
}
export class ChatGPT implements provider {
	apiKey: string;

	constructor(apiKey: string) {
		this.apiKey = apiKey;
	}

	async call(
		message: string,
		model: string,
		temperature: number,
	): Promise<string> {
		try {
			const response = await requestUrl({
				url: "https://api.openai.com/v1/chat/completions",
				method: "POST",
				headers: {
					Authorization: `Bearer ${this.apiKey}`,
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					model: model,
					messages: [{ role: "user", content: message }],
					temperature: temperature,
				}),
			});

			const result = response.json as OpenAIResponse;
			const improvedText = result?.choices?.[0]?.message?.content?.trim();
			if (!improvedText) {
				throw new Error(response.text);
			}
			return improvedText;
		} catch (error) {
			console.error("LLM response Error:", error);
			throw new Error(
				error instanceof Error ? error.message : String(error),
			);
		}
	}
}
