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
	// no temperature field, plus client identification. Without `User-Agent`
	// and a stable `x-opencode-session` the gateway answers 400 MissingSessionID.
	if (config.provider === "opencodego") {
		return new OpenAICompatible(
			baseUrl,
			config.apiKey,
			{
				"User-Agent": "modai-obsidian/1.0",
				"x-opencode-session": goSessionId(),
			},
			{ stream: true, sendTemperature: false },
		);
	}

	return new OpenAICompatible(baseUrl, config.apiKey);
}

let cachedGoSession: string | null = null;

/** Stable session id per app load, in UUID shape the gateway accepts. */
function goSessionId(): string {
	if (cachedGoSession !== null) return cachedGoSession;

	cachedGoSession =
		typeof crypto !== "undefined" && "randomUUID" in crypto
			? crypto.randomUUID()
			: fallbackUuid();

	return cachedGoSession;
}

function fallbackUuid(): string {
	const hex = (length: number): string =>
		[...Array<string>(length)]
			.map(() => Math.floor(Math.random() * 16).toString(16))
			.join("");

	return `${hex(8)}-${hex(4)}-4${hex(3)}-${["8", "9", "a", "b"][Math.floor(Math.random() * 4)]}${hex(3)}-${hex(12)}`;
}
