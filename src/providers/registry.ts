/**
 * Every provider Modai can talk to.
 *
 * Most of them speak the OpenAI chat completions dialect, so they only differ in
 * their endpoint; Gemini has its own API shape. `baseUrl` is the default and the
 * `baseUrl` setting overrides it for any of them.
 */

type ProviderDialect = "openai" | "gemini";

interface ModelOption {
	/** Model id sent to the provider. */
	id: string;
	/** Label shown in the settings dropdown. */
	label: string;
}

export interface ProviderInfo {
	label: string;
	dialect: ProviderDialect;
	/** Default endpoint; the `baseUrl` setting takes precedence when set. */
	baseUrl: string;
	/** Model used when this provider is picked and the current one is unknown. */
	defaultModel: string;
	/** Curated models; providers without one use the custom model field. */
	models: ModelOption[];
}

export const PROVIDERS = {
	openai: {
		label: "OpenAI",
		dialect: "openai",
		baseUrl: "https://api.openai.com/v1",
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
	anthropic: {
		label: "Anthropic",
		dialect: "openai",
		baseUrl: "https://api.anthropic.com/v1",
		defaultModel: "claude-sonnet-5",
		models: [
			{ id: "claude-opus-5", label: "Claude Opus 5 (deepest)" },
			{ id: "claude-sonnet-5", label: "Claude Sonnet 5 (balanced)" },
			{ id: "claude-haiku-4-5", label: "Claude Haiku 4.5 (fast)" },
		],
	},
	gemini: {
		label: "Google Gemini",
		dialect: "gemini",
		baseUrl: "https://generativelanguage.googleapis.com/v1beta",
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
	opencode: {
		label: "OpenCode Zen",
		dialect: "openai",
		baseUrl: "https://opencode.ai/zen/v1",
		defaultModel: "deepseek-v4-flash",
		models: [
			{ id: "deepseek-v4-flash", label: "DeepSeek V4 flash" },
			{ id: "deepseek-v4-pro", label: "DeepSeek V4 pro" },
			{ id: "glm-5.3", label: "GLM 5.3" },
			{ id: "kimi-k3", label: "Kimi K3" },
			{ id: "minimax-m3", label: "MiniMax M3" },
			{ id: "big-pickle", label: "Big Pickle (free)" },
			{ id: "mimo-v2.5-free", label: "MiMo V2.5 (free)" },
		],
	},
	openrouter: {
		label: "OpenRouter",
		dialect: "openai",
		baseUrl: "https://openrouter.ai/api/v1",
		defaultModel: "",
		models: [],
	},
	vercel: {
		label: "Vercel AI Gateway",
		dialect: "openai",
		baseUrl: "https://ai-gateway.vercel.sh/v1",
		defaultModel: "",
		models: [],
	},
	huggingface: {
		label: "Hugging Face",
		dialect: "openai",
		baseUrl: "https://router.huggingface.co/v1",
		defaultModel: "",
		models: [],
	},
	poe: {
		label: "Poe",
		dialect: "openai",
		baseUrl: "https://api.poe.com/v1",
		defaultModel: "",
		models: [],
	},
	nanogpt: {
		label: "Nano-GPT",
		dialect: "openai",
		baseUrl: "https://nano-gpt.com/api/v1",
		defaultModel: "",
		models: [],
	},
	pollinations: {
		label: "Pollinations",
		dialect: "openai",
		baseUrl: "https://text.pollinations.ai/openai",
		defaultModel: "",
		models: [],
	},
	chutes: {
		label: "Chutes",
		dialect: "openai",
		baseUrl: "https://llm.chutes.ai/v1",
		defaultModel: "",
		models: [],
	},
	novita: {
		label: "Novita AI",
		dialect: "openai",
		baseUrl: "https://api.novita.ai/v3/openai",
		defaultModel: "",
		models: [],
	},
	mistral: {
		label: "Mistral",
		dialect: "openai",
		baseUrl: "https://api.mistral.ai/v1",
		defaultModel: "",
		models: [],
	},
	groq: {
		label: "Groq",
		dialect: "openai",
		baseUrl: "https://api.groq.com/openai/v1",
		defaultModel: "",
		models: [],
	},
	deepseek: {
		label: "DeepSeek",
		dialect: "openai",
		baseUrl: "https://api.deepseek.com/v1",
		defaultModel: "",
		models: [],
	},
	xai: {
		label: "xAI (Grok)",
		dialect: "openai",
		baseUrl: "https://api.x.ai/v1",
		defaultModel: "",
		models: [],
	},
	together: {
		label: "Together AI",
		dialect: "openai",
		baseUrl: "https://api.together.xyz/v1",
		defaultModel: "",
		models: [],
	},
	fireworks: {
		label: "Fireworks AI",
		dialect: "openai",
		baseUrl: "https://api.fireworks.ai/inference/v1",
		defaultModel: "",
		models: [],
	},
	perplexity: {
		label: "Perplexity",
		dialect: "openai",
		baseUrl: "https://api.perplexity.ai",
		defaultModel: "",
		models: [],
	},
	cerebras: {
		label: "Cerebras",
		dialect: "openai",
		baseUrl: "https://api.cerebras.ai/v1",
		defaultModel: "",
		models: [],
	},
	sambanova: {
		label: "SambaNova",
		dialect: "openai",
		baseUrl: "https://api.sambanova.ai/v1",
		defaultModel: "",
		models: [],
	},
	nvidia: {
		label: "NVIDIA NIM",
		dialect: "openai",
		baseUrl: "https://integrate.api.nvidia.com/v1",
		defaultModel: "",
		models: [],
	},
	deepinfra: {
		label: "DeepInfra",
		dialect: "openai",
		baseUrl: "https://api.deepinfra.com/v1/openai",
		defaultModel: "",
		models: [],
	},
	hyperbolic: {
		label: "Hyperbolic",
		dialect: "openai",
		baseUrl: "https://api.hyperbolic.xyz/v1",
		defaultModel: "",
		models: [],
	},
	nebius: {
		label: "Nebius",
		dialect: "openai",
		baseUrl: "https://api.studio.nebius.ai/v1",
		defaultModel: "",
		models: [],
	},
	friendli: {
		label: "FriendliAI",
		dialect: "openai",
		baseUrl: "https://api.friendli.ai/serverless/v1",
		defaultModel: "",
		models: [],
	},
	upstage: {
		label: "Upstage",
		dialect: "openai",
		baseUrl: "https://api.upstage.ai/v1",
		defaultModel: "",
		models: [],
	},
	ai21: {
		label: "AI21",
		dialect: "openai",
		baseUrl: "https://api.ai21.com/studio/v1",
		defaultModel: "",
		models: [],
	},
	cohere: {
		label: "Cohere",
		dialect: "openai",
		baseUrl: "https://api.cohere.ai/compatibility/v1",
		defaultModel: "",
		models: [],
	},
	nousresearch: {
		label: "Nous Research",
		dialect: "openai",
		baseUrl: "https://inference-api.nousresearch.com/v1",
		defaultModel: "",
		models: [],
	},
	moonshot: {
		label: "Moonshot (Kimi)",
		dialect: "openai",
		baseUrl: "https://api.moonshot.ai/v1",
		defaultModel: "",
		models: [],
	},
	zai: {
		label: "Z.ai (GLM)",
		dialect: "openai",
		baseUrl: "https://api.z.ai/api/paas/v4",
		defaultModel: "",
		models: [],
	},
	zhipu: {
		label: "Zhipu (BigModel)",
		dialect: "openai",
		baseUrl: "https://open.bigmodel.cn/api/paas/v4",
		defaultModel: "",
		models: [],
	},
	qwen: {
		label: "Alibaba Qwen (DashScope)",
		dialect: "openai",
		baseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1",
		defaultModel: "",
		models: [],
	},
	minimax: {
		label: "MiniMax",
		dialect: "openai",
		baseUrl: "https://api.minimax.io/v1",
		defaultModel: "",
		models: [],
	},
	siliconflow: {
		label: "SiliconFlow",
		dialect: "openai",
		baseUrl: "https://api.siliconflow.cn/v1",
		defaultModel: "",
		models: [],
	},
	ppio: {
		label: "PPIO",
		dialect: "openai",
		baseUrl: "https://api.ppinfra.com/v3/openai",
		defaultModel: "",
		models: [],
	},
	stepfun: {
		label: "StepFun",
		dialect: "openai",
		baseUrl: "https://api.stepfun.com/v1",
		defaultModel: "",
		models: [],
	},
	baichuan: {
		label: "Baichuan",
		dialect: "openai",
		baseUrl: "https://api.baichuan-ai.com/v1",
		defaultModel: "",
		models: [],
	},
	ollama: {
		label: "Ollama (local)",
		dialect: "openai",
		baseUrl: "http://localhost:11434/v1",
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
	ollamacloud: {
		label: "Ollama Cloud",
		dialect: "openai",
		baseUrl: "https://ollama.com/v1",
		defaultModel: "",
		models: [],
	},
	lmstudio: {
		label: "LM Studio (local)",
		dialect: "openai",
		baseUrl: "http://localhost:1234/v1",
		defaultModel: "",
		models: [],
	},
	llamacpp: {
		label: "llama.cpp (local)",
		dialect: "openai",
		baseUrl: "http://localhost:8080/v1",
		defaultModel: "",
		models: [],
	},
	vllm: {
		label: "vLLM (local)",
		dialect: "openai",
		baseUrl: "http://localhost:8000/v1",
		defaultModel: "",
		models: [],
	},
	localai: {
		label: "LocalAI (local)",
		dialect: "openai",
		baseUrl: "http://localhost:8080/v1",
		defaultModel: "",
		models: [],
	},
	jan: {
		label: "Jan (local)",
		dialect: "openai",
		baseUrl: "http://localhost:1337/v1",
		defaultModel: "",
		models: [],
	},
	koboldcpp: {
		label: "KoboldCpp (local)",
		dialect: "openai",
		baseUrl: "http://localhost:5001/v1",
		defaultModel: "",
		models: [],
	},
	textgenwebui: {
		label: "Text generation webui (local)",
		dialect: "openai",
		baseUrl: "http://localhost:5000/v1",
		defaultModel: "",
		models: [],
	},
	custom: {
		label: "Custom endpoint (OpenAI compatible)",
		dialect: "openai",
		baseUrl: "",
		defaultModel: "",
		models: [],
	},
} satisfies Record<string, ProviderInfo>;

export type ProviderId = keyof typeof PROVIDERS;

/** Provider ids in the order they are offered in the settings. */
export const PROVIDER_IDS = Object.keys(PROVIDERS) as ProviderId[];

/** Providers that were named differently before the list grew. */
const LEGACY_PROVIDER_IDS: Record<string, ProviderId> = {
	llama: "ollama",
};

export function isProviderId(value: unknown): value is ProviderId {
	return typeof value === "string" && value in PROVIDERS;
}

/** Maps a provider id from an older version, if it changed. */
export function migrateProviderId(value: unknown): ProviderId | null {
	if (isProviderId(value)) return value;

	return typeof value === "string"
		? (LEGACY_PROVIDER_IDS[value] ?? null)
		: null;
}

/**
 * Infers the provider from a model name. Used to migrate settings saved before
 * the provider was selectable, when it was derived from the model prefix.
 */
export function providerForModel(model: string): ProviderId {
	if (model.startsWith("gemini")) return "gemini";
	if (model.startsWith("llama")) return "ollama";

	return "openai";
}

/** Whether `model` is one of the models suggested for `provider`. */
export function isSuggestedModel(provider: ProviderId, model: string): boolean {
	// Providers without curated models declare `models: []`, which widens to
	// `never[]`; the annotation keeps the element type usable.
	const models: ModelOption[] = PROVIDERS[provider].models;

	return models.some((option) => option.id === model);
}

/** Endpoint for a provider, with the configured override winning. */
export function resolveBaseUrl(provider: ProviderId, override: string): string {
	const trimmed = override.trim().replace(/\/+$/, "");

	return trimmed !== "" ? trimmed : PROVIDERS[provider].baseUrl;
}
