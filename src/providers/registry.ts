/**
 * Every provider Modai can talk to.
 *
 * Most of them speak the OpenAI chat completions dialect, so they only differ in
 * their endpoint; Gemini has its own API shape. `baseUrl` is the default and the
 * `baseUrl` setting overrides it for any of them. Models are never listed here:
 * they are read from the provider itself (see `models.ts`).
 */

type ProviderDialect = "openai" | "gemini";

export interface ProviderInfo {
	label: string;
	dialect: ProviderDialect;
	/** Default endpoint; the `baseUrl` setting takes precedence when set. */
	baseUrl: string;
}

export const PROVIDERS = {
	openai: {
		label: "OpenAI",
		dialect: "openai",
		baseUrl: "https://api.openai.com/v1",
	},
	anthropic: {
		label: "Anthropic",
		dialect: "openai",
		baseUrl: "https://api.anthropic.com/v1",
	},
	gemini: {
		label: "Google Gemini",
		dialect: "gemini",
		baseUrl: "https://generativelanguage.googleapis.com/v1beta",
	},
	opencode: {
		label: "OpenCode Zen",
		dialect: "openai",
		baseUrl: "https://opencode.ai/zen/v1",
	},
	opencodego: {
		label: "OpenCode Go",
		dialect: "openai",
		baseUrl: "https://opencode.ai/zen/go/v1",
	},
	openrouter: {
		label: "OpenRouter",
		dialect: "openai",
		baseUrl: "https://openrouter.ai/api/v1",
	},
	vercel: {
		label: "Vercel AI Gateway",
		dialect: "openai",
		baseUrl: "https://ai-gateway.vercel.sh/v1",
	},
	huggingface: {
		label: "Hugging Face",
		dialect: "openai",
		baseUrl: "https://router.huggingface.co/v1",
	},
	poe: {
		label: "Poe",
		dialect: "openai",
		baseUrl: "https://api.poe.com/v1",
	},
	nanogpt: {
		label: "Nano-GPT",
		dialect: "openai",
		baseUrl: "https://nano-gpt.com/api/v1",
	},
	pollinations: {
		label: "Pollinations",
		dialect: "openai",
		baseUrl: "https://text.pollinations.ai/openai",
	},
	chutes: {
		label: "Chutes",
		dialect: "openai",
		baseUrl: "https://llm.chutes.ai/v1",
	},
	novita: {
		label: "Novita AI",
		dialect: "openai",
		baseUrl: "https://api.novita.ai/v3/openai",
	},
	mistral: {
		label: "Mistral",
		dialect: "openai",
		baseUrl: "https://api.mistral.ai/v1",
	},
	groq: {
		label: "Groq",
		dialect: "openai",
		baseUrl: "https://api.groq.com/openai/v1",
	},
	deepseek: {
		label: "DeepSeek",
		dialect: "openai",
		baseUrl: "https://api.deepseek.com/v1",
	},
	xai: {
		label: "xAI (Grok)",
		dialect: "openai",
		baseUrl: "https://api.x.ai/v1",
	},
	together: {
		label: "Together AI",
		dialect: "openai",
		baseUrl: "https://api.together.xyz/v1",
	},
	fireworks: {
		label: "Fireworks AI",
		dialect: "openai",
		baseUrl: "https://api.fireworks.ai/inference/v1",
	},
	perplexity: {
		label: "Perplexity",
		dialect: "openai",
		baseUrl: "https://api.perplexity.ai",
	},
	cerebras: {
		label: "Cerebras",
		dialect: "openai",
		baseUrl: "https://api.cerebras.ai/v1",
	},
	sambanova: {
		label: "SambaNova",
		dialect: "openai",
		baseUrl: "https://api.sambanova.ai/v1",
	},
	nvidia: {
		label: "NVIDIA NIM",
		dialect: "openai",
		baseUrl: "https://integrate.api.nvidia.com/v1",
	},
	deepinfra: {
		label: "DeepInfra",
		dialect: "openai",
		baseUrl: "https://api.deepinfra.com/v1/openai",
	},
	hyperbolic: {
		label: "Hyperbolic",
		dialect: "openai",
		baseUrl: "https://api.hyperbolic.xyz/v1",
	},
	nebius: {
		label: "Nebius",
		dialect: "openai",
		baseUrl: "https://api.studio.nebius.ai/v1",
	},
	friendli: {
		label: "FriendliAI",
		dialect: "openai",
		baseUrl: "https://api.friendli.ai/serverless/v1",
	},
	upstage: {
		label: "Upstage",
		dialect: "openai",
		baseUrl: "https://api.upstage.ai/v1",
	},
	ai21: {
		label: "AI21",
		dialect: "openai",
		baseUrl: "https://api.ai21.com/studio/v1",
	},
	cohere: {
		label: "Cohere",
		dialect: "openai",
		baseUrl: "https://api.cohere.ai/compatibility/v1",
	},
	nousresearch: {
		label: "Nous Research",
		dialect: "openai",
		baseUrl: "https://inference-api.nousresearch.com/v1",
	},
	moonshot: {
		label: "Moonshot (Kimi)",
		dialect: "openai",
		baseUrl: "https://api.moonshot.ai/v1",
	},
	zai: {
		label: "Z.ai (GLM)",
		dialect: "openai",
		baseUrl: "https://api.z.ai/api/paas/v4",
	},
	zhipu: {
		label: "Zhipu (BigModel)",
		dialect: "openai",
		baseUrl: "https://open.bigmodel.cn/api/paas/v4",
	},
	qwen: {
		label: "Alibaba Qwen (DashScope)",
		dialect: "openai",
		baseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1",
	},
	minimax: {
		label: "MiniMax",
		dialect: "openai",
		baseUrl: "https://api.minimax.io/v1",
	},
	siliconflow: {
		label: "SiliconFlow",
		dialect: "openai",
		baseUrl: "https://api.siliconflow.cn/v1",
	},
	ppio: {
		label: "PPIO",
		dialect: "openai",
		baseUrl: "https://api.ppinfra.com/v3/openai",
	},
	stepfun: {
		label: "StepFun",
		dialect: "openai",
		baseUrl: "https://api.stepfun.com/v1",
	},
	baichuan: {
		label: "Baichuan",
		dialect: "openai",
		baseUrl: "https://api.baichuan-ai.com/v1",
	},
	ollama: {
		label: "Ollama (local)",
		dialect: "openai",
		baseUrl: "http://localhost:11434/v1",
	},
	ollamacloud: {
		label: "Ollama Cloud",
		dialect: "openai",
		baseUrl: "https://ollama.com/v1",
	},
	lmstudio: {
		label: "LM Studio (local)",
		dialect: "openai",
		baseUrl: "http://localhost:1234/v1",
	},
	llamacpp: {
		label: "llama.cpp (local)",
		dialect: "openai",
		baseUrl: "http://localhost:8080/v1",
	},
	vllm: {
		label: "vLLM (local)",
		dialect: "openai",
		baseUrl: "http://localhost:8000/v1",
	},
	localai: {
		label: "LocalAI (local)",
		dialect: "openai",
		baseUrl: "http://localhost:8080/v1",
	},
	jan: {
		label: "Jan (local)",
		dialect: "openai",
		baseUrl: "http://localhost:1337/v1",
	},
	koboldcpp: {
		label: "KoboldCpp (local)",
		dialect: "openai",
		baseUrl: "http://localhost:5001/v1",
	},
	textgenwebui: {
		label: "Text generation webui (local)",
		dialect: "openai",
		baseUrl: "http://localhost:5000/v1",
	},
	custom: {
		label: "Custom endpoint (OpenAI compatible)",
		dialect: "openai",
		baseUrl: "",
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

/** Strips path suffixes users sometimes paste from docs. */
function normalizeBaseUrl(raw: string): string {
	const trimmed = raw.trim().replace(/\/+$/, "");
	const stripped = trimmed.replace(/\/(chat\/completions|models)\/?$/i, "");

	return stripped.replace(/\/+$/, "");
}

/** Endpoint for a provider, with the configured override winning. */
export function resolveBaseUrl(provider: ProviderId, override: string): string {
	const trimmed = normalizeBaseUrl(override);

	return trimmed !== "" ? trimmed : PROVIDERS[provider].baseUrl;
}
