import { requestUrl } from "obsidian";
import { provider } from "./base";

interface OpenAIResponse {
	choices?: {
		message?: {
			content?: string;
		};
	}[];
}

/** HTTP failure with the gateway error body attached. */
class GatewayError extends Error {}

/**
 * Client for every provider that speaks the OpenAI chat completions dialect.
 * The endpoint comes from the provider registry, or from the `baseUrl` setting.
 */
export class OpenAICompatible implements provider {
	baseUrl: string;
	apiKey: string;
	extraHeaders: Record<string, string>;

	constructor(
		baseUrl: string,
		apiKey: string,
		extraHeaders: Record<string, string> = {},
	) {
		this.baseUrl = baseUrl;
		this.apiKey = apiKey;
		this.extraHeaders = extraHeaders;
	}

	async call(
		message: string,
		model: string,
		temperature: number,
	): Promise<string> {
		const url = `${this.baseUrl.replace(/\/+$/, "")}/chat/completions`;
		const headers: Record<string, string> = {
			"Content-Type": "application/json",
			...this.extraHeaders,
			// Local servers do not check the token, and some reject an
			// empty bearer header outright.
			...(this.apiKey.trim() === ""
				? {}
				: { Authorization: `Bearer ${this.apiKey}` }),
		};
		const payload = JSON.stringify({
			model: model,
			messages: [{ role: "user", content: message }],
			temperature: temperature,
		});

		try {
			const { result, status, text } = await this.post(
				url,
				headers,
				payload,
			);
			const content = result?.choices?.[0]?.message?.content?.trim();
			if (!content) {
				throw new Error(
					`No response content. Status: ${status} ${text}`.trim(),
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

	/**
	 * Posts JSON and answers with the parsed body. `fetch` runs first so a
	 * gateway error body survives — `requestUrl` throws it away and keeps the
	 * status only. When `fetch` cannot run (CORS, no window), `requestUrl`
	 * takes over.
	 */
	private async post(
		url: string,
		headers: Record<string, string>,
		payload: string,
	): Promise<{ result: OpenAIResponse; status: number; text: string }> {
		if (typeof window !== "undefined" && typeof fetch === "function") {
			try {
				const response = await fetch(url, {
					method: "POST",
					headers,
					body: payload,
				});
				const text = await response.text();
				if (!response.ok) {
					throw new GatewayError(
						`HTTP ${response.status} ${truncate(text)}`.trim(),
					);
				}

				return {
					result: JSON.parse(text) as OpenAIResponse,
					status: response.status,
					text,
				};
			} catch (error) {
				if (error instanceof GatewayError) throw error;
				// Network or CORS failure: fall through to `requestUrl`.
			}
		}

		const response = await requestUrl({
			url,
			method: "POST",
			headers,
			body: payload,
		});

		return {
			result: response.json as OpenAIResponse,
			status: response.status,
			text: response.text,
		};
	}
}

/** First 500 characters of a gateway error body, on one line. */
function truncate(text: string): string {
	const single = text.replace(/\s+/g, " ").trim();

	return single.length > 500 ? `${single.slice(0, 499)}…` : single;
}
