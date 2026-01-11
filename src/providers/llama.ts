import { requestUrl } from "obsidian";
import { provider } from "./base";

interface LlamaResponse {
	choices?: {
		message?: {
			content?: string;
		};
	}[];
}

export class Llama implements provider {
	apiKey: string;
	baseUrl: string;

	constructor(apiKey = "ollama", baseUrl = "http://127.0.0.1:11434") {
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
				url: `${this.baseUrl}/v1/chat/completions`,
				method: "POST",
				headers: {
					Authorization: `Bearer ${this.apiKey}`,
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					model: model,
					messages: [{ role: "user", content: message }],
					temperature: temperature,
					stream: false,
				}),
			});

			const result = response.json as LlamaResponse;
			const content = result?.choices?.[0]?.message?.content?.trim();

			if (!content) {
				throw new Error(
					`No response content. Status: ${response.status}`,
				);
			}

			return content;
		} catch (error) {
			console.error("Llama Provider Error:", error);
			throw new Error(
				error instanceof Error ? error.message : String(error),
			);
		}
	}
}
