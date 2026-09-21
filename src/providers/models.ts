import { requestUrl } from "obsidian";
import { PROVIDERS, ProviderId, resolveBaseUrl } from "./registry";

export interface ModelListResult {
	/** Model ids the provider reported, sorted and without duplicates. */
	models: string[];
	/** Why the list could not be read, if it could not. */
	error: string | null;
}

/** Keeps the dropdown usable when a gateway offers hundreds of models. */
const MAX_MODELS = 500;

/** Endpoint that lists the models of a provider. */
export function modelsUrl(
	provider: ProviderId,
	baseUrl: string,
	apiKey: string,
): string {
	const url = `${resolveBaseUrl(provider, baseUrl)}/models`;

	return PROVIDERS[provider].dialect === "gemini"
		? `${url}?key=${apiKey}`
		: url;
}

/** Model ids out of a `/models` payload, in either dialect. */
export function parseModelIds(
	provider: ProviderId,
	payload: unknown,
): string[] {
	if (typeof payload !== "object" || payload === null) return [];

	const record = payload as Record<string, unknown>;
	const entries =
		PROVIDERS[provider].dialect === "gemini"
			? // Gemini answers with { models: [{ name: "models/gemini-2.5-flash" }] }
				(record.models as unknown[])
			: // Everyone else follows OpenAI: { data: [{ id: "gpt-4o" }] }
				(record.data as unknown[]);

	if (!Array.isArray(entries)) return [];

	const ids = entries
		.map((entry) => {
			if (typeof entry !== "object" || entry === null) return "";
			const item = entry as Record<string, unknown>;
			const id =
				typeof item.id === "string"
					? item.id
					: typeof item.name === "string"
						? item.name
						: "";

			return id.replace(/^models\//, "").trim();
		})
		.filter((id) => id !== "");

	return [...new Set(ids)].sort().slice(0, MAX_MODELS);
}

/**
 * Asks the provider which models it offers. Providers without a `/models`
 * endpoint, a missing token or an offline machine all end up as an empty list
 * with a reason, and the settings let the user type a model instead.
 */
export async function fetchModels(config: {
	provider: ProviderId;
	apiKey: string;
	baseUrl: string;
}): Promise<ModelListResult> {
	const url = modelsUrl(config.provider, config.baseUrl, config.apiKey);
	if (!url.startsWith("http")) {
		return { models: [], error: "No endpoint configured." };
	}

	try {
		const response = await requestUrl({
			url,
			method: "GET",
			headers:
				config.apiKey.trim() === ""
					? {}
					: { Authorization: `Bearer ${config.apiKey}` },
		});

		if (response.status >= 400) {
			return {
				models: [],
				error: `${response.status} from ${hostOf(url)}`,
			};
		}

		const models = parseModelIds(config.provider, response.json);
		if (models.length === 0) {
			return {
				models: [],
				error: `${hostOf(url)} did not list any models`,
			};
		}

		return { models, error: null };
	} catch (error) {
		return {
			models: [],
			error: error instanceof Error ? error.message : String(error),
		};
	}
}

function hostOf(url: string): string {
	try {
		return new URL(url).host;
	} catch {
		return url;
	}
}
