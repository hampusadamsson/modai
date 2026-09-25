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

	// OpenCode Go monitors traffic shape. Docs ask clients to identify
	// with their own user agent plus stable session id per conversation.
	// Without those headers gateway answers 400 even for chat-compatible IDs.
	if (config.provider === "opencodego") {
		return new OpenAICompatible(baseUrl, config.apiKey, {
			"User-Agent": "modai-obsidian/1.0",
			"x-opencode-session": sessionId(),
		});
	}

	return new OpenAICompatible(baseUrl, config.apiKey);
}

let cachedSession: string | null = null;

/** Stable id per app load, reused across calls in same conversation. */
function sessionId(): string {
	if (cachedSession !== null) return cachedSession;

	cachedSession = `${Date.now()}-${Math.floor(Math.random() * 1e9)}`;

	return cachedSession;
}
