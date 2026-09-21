import { provider } from "./base";
import { Gemini } from "./gemini";
import { OpenAICompatible } from "./openai";
import { PROVIDERS, ProviderId, resolveBaseUrl } from "./registry";

export interface ProviderConfig {
	/** Provider selected in the settings. */
	provider: ProviderId;
	/** Single token for that provider; local servers may leave it empty. */
	apiKey: string;
	/** Endpoint override; empty uses the provider's default. */
	baseUrl: string;
}

/** Resolves the provider implementation selected in the settings. */
export function createProvider(config: ProviderConfig): provider {
	const info = PROVIDERS[config.provider];
	if (!info) {
		throw new Error(`Unknown provider: ${String(config.provider)}`);
	}

	const baseUrl = resolveBaseUrl(config.provider, config.baseUrl);
	if (baseUrl === "") {
		throw new Error(
			`No endpoint for ${info.label}. Set a base URL in Modai's settings.`,
		);
	}

	return info.dialect === "gemini"
		? new Gemini(config.apiKey, baseUrl)
		: new OpenAICompatible(baseUrl, config.apiKey);
}
