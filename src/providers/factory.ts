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

	if (info.dialect === "gemini") {
		return new Gemini(config.apiKey, baseUrl);
	}

	// OpenCode Go only accepts the validated shape: streamed completions with
	// no temperature field. Anything else answers 400.
	if (config.provider === "opencodego") {
		return new OpenAICompatible(
			baseUrl,
			config.apiKey,
			{},
			{ stream: true, sendTemperature: false },
		);
	}

	return new OpenAICompatible(baseUrl, config.apiKey);
}
