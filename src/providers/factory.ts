import { provider } from "./base";
import { ChatGPT } from "./chatgpt";
import { Gemini } from "./gemini";
import { Llama } from "./llama";
import { ProviderId } from "./registry";

export interface ProviderConfig {
	/** Provider selected in the settings. */
	provider: ProviderId;
	/** Model id, either one of the suggestions or any id the provider accepts. */
	model: string;
	openAIKey: string;
	geminiAIKey: string;
	llamaAIKey: string;
	llamaBaseUrl: string;
}

/** Resolves the provider implementation selected in the settings. */
export function createProvider(config: ProviderConfig): provider {
	switch (config.provider) {
		case "openai":
			return new ChatGPT(config.openAIKey);
		case "gemini":
			return new Gemini(config.geminiAIKey);
		case "llama":
			return new Llama(config.llamaAIKey, config.llamaBaseUrl);
		default:
			// Persisted settings are validated on load, so this only guards
			// against a provider added to `ProviderId` without a case here.
			throw new Error(`Unknown provider: ${String(config.provider)}`);
	}
}
