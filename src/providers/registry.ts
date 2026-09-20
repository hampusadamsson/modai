export type ProviderId = "openai" | "gemini" | "llama";

interface ModelOption {
	/** Model id sent to the provider. */
	id: string;
	/** Label shown in the settings dropdown. */
	label: string;
}

export interface ProviderInfo {
	id: ProviderId;
	/** Label shown in the provider dropdown. */
	label: string;
	/** Model used when the provider is selected without a model of its own. */
	defaultModel: string;
	/** Models suggested for this provider. Any other id can be entered by hand. */
	models: ModelOption[];
}

export const PROVIDERS: Record<ProviderId, ProviderInfo> = {
	openai: {
		id: "openai",
		label: "OpenAI",
		defaultModel: "gpt-4-turbo",
		models: [
			{ id: "gpt-5.2", label: "GPT-5.2 (flagship reasoning)" },
			{ id: "gpt-5.2-pro", label: "GPT-5.2 pro (research & smarts)" },
			{ id: "gpt-5.1", label: "GPT-5.1 (balanced performance)" },
			{ id: "gpt-5", label: "GPT-5 (standard reasoning)" },
			{ id: "gpt-5-mini", label: "GPT-5 mini (fast & affordable)" },
			{ id: "gpt-5-nano", label: "GPT-5 nano (high speed/low cost)" },
			{ id: "gpt-4.1", label: "GPT-4.1 (stable general purpose)" },
			{
				id: "gpt-4.1-mini",
				label: "GPT-4.1 mini (efficient all-rounder)",
			},
			{ id: "gpt-4o", label: "GPT-4o (omni/multimodal)" },
			{ id: "gpt-4o-mini", label: "GPT-4o mini (budget omni)" },
			{ id: "gpt-4-turbo", label: "GPT-4 turbo (stable legacy)" },
			{ id: "gpt-4", label: "GPT-4 (original high-int)" },
			{ id: "gpt-3.5-turbo", label: "GPT-3.5 turbo" },
		],
	},
	gemini: {
		id: "gemini",
		label: "Gemini",
		defaultModel: "gemini-2.5-flash",
		models: [
			{
				id: "gemini-3-pro",
				label: "Gemini 3 pro (state-of-the-art reasoning & agents)",
			},
			{
				id: "gemini-3-flash",
				label: "Gemini 3 flash (fast, intelligent default)",
			},
			{
				id: "gemini-2.5-pro",
				label: "Gemini 2.5 pro (stable deep reasoning, 1m context)",
			},
			{
				id: "gemini-2.5-flash",
				label: "Gemini 2.5 flash (balanced speed & production stability)",
			},
			{
				id: "gemini-2.5-flash-lite",
				label: "Gemini 2.5 flash-lite (budget / high-throughput)",
			},
		],
	},
	llama: {
		id: "llama",
		label: "Llama (Ollama)",
		defaultModel: "llama3.1:8b",
		models: [
			{ id: "llama3.1:8b", label: "Llama 3.1 8b (local deployment)" },
			{
				id: "llama-3-70b",
				label: "Llama 3 70b (local deployment, high performance)",
			},
			{
				id: "llama-2-70b",
				label: "Llama 2 70b (local deployment, widely supported)",
			},
			{
				id: "llama-2-13b",
				label: "Llama 2 13b (local deployment, balanced size)",
			},
			{
				id: "llama-2-7b",
				label: "Llama 2 7b (local deployment, lightweight)",
			},
		],
	},
};

/** Provider ids in the order they are offered in the settings. */
export const PROVIDER_IDS = Object.keys(PROVIDERS) as ProviderId[];

export function isProviderId(value: unknown): value is ProviderId {
	return typeof value === "string" && value in PROVIDERS;
}

/**
 * Infers the provider from a model name. Used to migrate settings saved before
 * the provider became selectable, when it was derived from the model prefix.
 */
export function providerForModel(model: string): ProviderId {
	if (model.startsWith("gemini")) return "gemini";
	if (model.startsWith("llama")) return "llama";

	return "openai";
}

/** Whether `model` is one of the models suggested for `provider`. */
export function isSuggestedModel(provider: ProviderId, model: string): boolean {
	return PROVIDERS[provider].models.some((option) => option.id === model);
}
