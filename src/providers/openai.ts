import { requestUrl } from "obsidian";
import { provider } from "./base";

interface OpenAIResponse {
	choices?: {
		message?: {
			content?: string;
		};
	}[];
}

/**
 * Client for every provider that speaks the OpenAI chat completions dialect.
 * The endpoint comes from the provider registry, or from the `baseUrl` setting.
 */
export class OpenAICompatible implements provider {
	baseUrl: string;
	apiKey: string;

	constructor(baseUrl: string, apiKey: string) {
		this.baseUrl = baseUrl;
		this.apiKey = apiKey;
	}

	async call(
		message: string,
		model: string,
		temperature: number,
	): Promise<string> {
		const url = `${this.baseUrl.replace(/\/+$/, "")}/chat/completions`;

		try {
			const response = await requestUrl({
				url,
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					// Local servers do not check the token, and some reject an
					// empty bearer header outright.
					...(this.apiKey.trim() === ""
						? {}
						: { Authorization: `Bearer ${this.apiKey}` }),
				},
				body: JSON.stringify({
					model: model,
					messages: [{ role: "user", content: message }],
					temperature: temperature,
				}),
			});

			const result = response.json as OpenAIResponse;
			const content = result?.choices?.[0]?.message?.content?.trim();
			if (!content) {
				throw new Error(
					`No response content. Status: ${response.status} ${response.text ?? ""}`.trim(),
				);
			}

			return content;
		} catch (error) {
			console.error(`Modai: chat completion failed POST ${url}`, error);
			const detail =
				error instanceof Error ? error.message : String(error);

			throw new Error(`POST ${url} failed: ${detail}`, {
				cause: error,
			});
		}
	}
}
