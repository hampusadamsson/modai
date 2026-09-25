import { requestUrl } from "obsidian";
import { provider } from "./base";

interface OpenAIResponse {
	choices?: {
		message?: {
			content?: string;
		};
		delta?: {
			content?: string;
		};
	}[];
}

/** Behavior switches for gateways that only accept the validated shape. */
export interface OpenAIOptions {
	/**
	 * Send `stream: true` and read the SSE answer instead of one JSON body.
	 * Matches the validated client, which always streams completions.
	 */
	stream?: boolean;
	/**
	 * Leave `temperature` out of the payload. Reasoning models reject the
	 * field; the validated client only sends it when explicitly set.
	 */
	sendTemperature?: boolean;
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
	private stream: boolean;
	private sendTemperature: boolean;

	constructor(
		baseUrl: string,
		apiKey: string,
		extraHeaders: Record<string, string> = {},
		options: OpenAIOptions = {},
	) {
		this.baseUrl = baseUrl;
		this.apiKey = apiKey;
		this.extraHeaders = extraHeaders;
		this.stream = options.stream ?? false;
		this.sendTemperature = options.sendTemperature ?? true;
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
			...(this.stream
				? { stream: true, stream_options: { include_usage: true } }
				: {}),
			...(this.sendTemperature ? { temperature: temperature } : {}),
		});

		try {
			const { result, status, raw } = await this.post(
				url,
				headers,
				payload,
			);
			const content = this.readContent(result, raw);
			if (!content) {
				throw new Error(
					`No response content. Status: ${status} ${raw}`.trim(),
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
	 * Posts JSON and answers with the parsed body. `requestUrl` runs first:
	 * silent, no CORS preflight noise. Only when it fails does `fetch` get a
	 * chance, to rescue the gateway error body `requestUrl` throws away —
	 * where CORS allows it.
	 */
	/**
	 * Reads the answer: one JSON body, or the SSE chunks when streaming.
	 * `raw` is the response text; `result` is its parsed JSON when it parses.
	 */
	private readContent(result: OpenAIResponse | null, raw: string): string {
		if (this.stream) return parseStreamText(raw);

		return result?.choices?.[0]?.message?.content?.trim() ?? "";
	}

	private async post(
		url: string,
		headers: Record<string, string>,
		payload: string,
	): Promise<{ result: OpenAIResponse | null; status: number; raw: string }> {
		try {
			const response = await requestUrl({
				url,
				method: "POST",
				headers,
				body: payload,
			});

			// The `.json` getter parses the whole body, which throws on an
			// event stream, so streaming reads the raw text instead.
			if (this.stream) {
				return {
					result: parseJson(response.text),
					status: response.status,
					raw: response.text,
				};
			}

			return {
				result: response.json as OpenAIResponse | null,
				status: response.status,
				raw: response.text,
			};
		} catch (error) {
			throw withBody(error, await fetchRaw(url, headers, payload));
		}
	}
}

/** Whether a body rescue via `fetch` can run here. */
function canFetch(): boolean {
	return typeof window !== "undefined" && typeof fetch === "function";
}

/** Reads the raw body, or answers null when `fetch` cannot run. */
async function fetchRaw(
	url: string,
	headers: Record<string, string>,
	payload: string,
): Promise<{ status: number; raw: string } | null> {
	if (!canFetch()) return null;

	try {
		const response = await fetch(url, {
			method: "POST",
			headers,
			body: payload,
		});

		return { status: response.status, raw: await response.text() };
	} catch {
		// Network or CORS failure: no body to rescue.
		return null;
	}
}

/**
 * Swaps a bodyless `requestUrl` failure for the gateway answer when `fetch`
 * rescued one, else keeps the original failure.
 */
function withBody(
	error: unknown,
	rescued: { status: number; raw: string } | null,
): Error {
	if (rescued === null) {
		return error instanceof Error ? error : new Error(String(error));
	}

	return new GatewayError(
		`HTTP ${rescued.status} ${truncate(rescued.raw)}`.trim(),
	);
}

/** Parses JSON, or answers null when the body is an event stream. */
function parseJson(text: string): OpenAIResponse | null {
	try {
		return JSON.parse(text) as OpenAIResponse;
	} catch {
		return null;
	}
}

/** Concatenates the `data:` chunks of an SSE answer, skipping `[DONE]`. */
function parseStreamText(text: string): string {
	const parts: string[] = [];

	for (const line of text.split("\n")) {
		const data = line.startsWith("data:")
			? line.slice("data:".length).trim()
			: "";
		if (data === "" || data === "[DONE]") continue;

		const chunk = parseJson(data);
		const delta = chunk?.choices?.[0]?.delta?.content;
		if (delta) parts.push(delta);
	}

	return parts.join("").trim();
}

/** First 500 characters of a gateway error body, on one line. */
function truncate(text: string): string {
	const single = text.replace(/\s+/g, " ").trim();

	return single.length > 500 ? `${single.slice(0, 499)}…` : single;
}
