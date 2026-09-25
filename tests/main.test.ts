import { describe, expect, it, vi } from "vitest";
import type { Mock } from "vitest";
import type { App, Command, PluginManifest } from "obsidian";
import Modai from "../src/main";
import {
	DEFAULT_SETTINGS,
	PluginSettings,
	resolveSettings,
} from "../src/settings";
import { fakeVault } from "./helpers/vault";
import type { Annotation } from "../src/workshop/annotations";
import { WorkshopState } from "../src/workshop/store";
import {
	lastRequest,
	respondWith,
	respondWithAfter,
	sentBody,
} from "./helpers/request-url";

type Vault = ReturnType<typeof fakeVault>;

type PluginMocks = {
	addCommand: Mock<(command: Command) => Command>;
	removeCommand: Mock<(commandId: string) => void>;
	addRibbonIcon: Mock;
};

/** The plugin mock records its calls on these. */
const mocks = (modai: Modai) => modai as unknown as PluginMocks;

function annotation(overrides: Partial<Annotation> = {}): Annotation {
	return {
		id: "a1",
		docPath: "Notes/Draft.md",
		role: "Editor",
		type: "edit",
		quote: "the cat",
		replacement: "the dog",
		comment: "",
		range: { from: 0, to: 7 },
		status: "pending",
		createdAt: 1,
		...overrides,
	};
}

function createPlugin(
	vault: Vault = fakeVault(),
	stored: Partial<PluginSettings> = {},
	workshop?: WorkshopState,
) {
	// Obsidian hands the plugin its app and manifest when it loads it.
	const instance = new Modai({} as App, {} as PluginManifest);
	instance.app = {
		vault,
		workspace: {
			on: vi.fn(() => ({})),
			getActiveViewOfType: () => null,
			getLeavesOfType: () => [],
			getRightLeaf: () => null,
			openLinkText: vi.fn(async () => undefined),
			revealLeaf: vi.fn(async () => undefined),
		},
	} as unknown as App;
	instance.loadData = vi.fn(async () =>
		workshop === undefined
			? stored
			: { version: 1, settings: stored, workshop },
	);
	instance.settings = resolveSettings(stored);
	instance.statusBarSpan = { setText: () => undefined } as never;
	return instance;
}

const commandIds = (modai: Modai) =>
	mocks(modai)
		.addCommand.mock.calls.map(([command]) => command.id)
		.sort();

const ROLE_FILES = {
	"Modai roles/Author.md": "write prose",
	"Modai roles/Poet.md": "write poetry",
};

describe("queryProvider", () => {
	it("queries the provider selected in the settings", async () => {
		respondWith({ json: { choices: [{ message: { content: "ok" } }] } });

		const modai = createPlugin(fakeVault(), {
			provider: "openai",
			apiKey: "sk-test",
			model: "gpt-4o",
		});

		await expect(modai.queryProvider("ROLE", "input")).resolves.toBe("ok");
		expect(lastRequest().url).toBe(
			"https://api.openai.com/v1/chat/completions",
		);
		expect(lastRequest().headers?.Authorization).toBe("Bearer sk-test");
	});

	it("sends a generic model id to the selected provider", async () => {
		respondWith({ json: { choices: [{ message: { content: "ok" } }] } });

		const modai = createPlugin(fakeVault(), {
			provider: "ollama",
			model: "qwen3:32b",
		});

		await modai.queryProvider("ROLE", "input");

		expect(lastRequest().url).toBe(
			"http://localhost:11434/v1/chat/completions",
		);
		expect(sentBody(lastRequest())).toMatchObject({ model: "qwen3:32b" });
		expect(lastRequest().headers).not.toHaveProperty("Authorization");
	});

	it("uses the endpoint override for any provider", async () => {
		respondWith({ json: { choices: [{ message: { content: "ok" } }] } });

		const modai = createPlugin(fakeVault(), {
			provider: "groq",
			apiKey: "token",
			baseUrl: "http://self-hosted:8000/v1",
			model: "my-model",
		});

		await modai.queryProvider("ROLE", "input");

		expect(lastRequest().url).toBe(
			"http://self-hosted:8000/v1/chat/completions",
		);
	});

	it("uses the selected provider's key and endpoint", async () => {
		respondWith({
			json: { candidates: [{ content: { parts: [{ text: "ok" }] } }] },
		});

		const modai = createPlugin(fakeVault(), {
			provider: "gemini",
			apiKey: "gemini-key",
			model: "gemini-2.5-flash",
		});

		await modai.queryProvider("ROLE", "input");

		expect(lastRequest().url).toBe(
			"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=gemini-key",
		);
	});

	it("sends the instructions and the text as one prompt", async () => {
		respondWith({ json: { choices: [{ message: { content: "ok" } }] } });

		const modai = createPlugin(fakeVault(), { model: "gpt-4o" });
		await modai.queryProvider("### ROLE\nEditor", "some text");

		const body = sentBody(lastRequest()) as {
			messages: { content: string }[];
			temperature: number;
		};

		expect(body.messages[0]?.content).toContain("### ROLE");
		expect(body.messages[0]?.content).toContain("some text");
		expect(body.temperature).toBe(DEFAULT_SETTINGS.temperature);
	});

	it("refuses to query without a model", async () => {
		const modai = createPlugin(fakeVault(), { model: "   " });

		await expect(modai.queryProvider("ROLE", "input")).rejects.toThrow(
			"No model configured",
		);
	});
});

describe("model catalog", () => {
	it("reads the models of the selected provider", async () => {
		respondWith({
			json: { data: [{ id: "gpt-5.2" }, { id: "gpt-4o" }] },
			status: 200,
		});

		const modai = createPlugin(fakeVault(), {
			provider: "openai",
			apiKey: "sk",
		});
		await modai.refreshModels();

		expect(lastRequest().url).toBe("https://api.openai.com/v1/models");
		expect(lastRequest().headers?.Authorization).toBe("Bearer sk");
		expect(modai.modelCatalog()).toEqual({
			models: ["gpt-4o", "gpt-5.2"],
			error: null,
			loading: false,
			loaded: true,
		});
	});

	it("keeps the reason when the provider will not list them", async () => {
		respondWith({ json: {}, status: 401 });

		const modai = createPlugin(fakeVault(), { provider: "openai" });
		await modai.refreshModels();

		expect(modai.modelCatalog()).toEqual({
			models: [],
			error: "401 from api.openai.com",
			loading: false,
			loaded: true,
		});
	});

	it("does not serve a list that belongs to other settings", async () => {
		respondWith({ json: { data: [{ id: "gpt-4o" }] }, status: 200 });

		const modai = createPlugin(fakeVault(), {
			provider: "openai",
			model: "gpt-4o",
		});
		await modai.refreshModels();
		expect(modai.modelCatalog().loaded).toBe(true);

		modai.settings.provider = "groq";

		expect(modai.modelCatalog()).toMatchObject({
			models: [],
			loaded: false,
		});
	});

	it("ignores an answer that arrives after the settings changed", async () => {
		const modai = createPlugin(fakeVault(), { provider: "openai" });
		respondWithAfter(
			() => {
				modai.settings.provider = "groq";
			},
			{ json: { data: [{ id: "late-model" }] }, status: 200 },
		);

		await modai.refreshModels();

		expect(modai.modelCatalog()).toMatchObject({
			models: [],
			loaded: false,
		});
	});
});

describe("reviewing one at a time", () => {
	it("brings up the next suggestion after a rejection", async () => {
		const modai = createPlugin(
			fakeVault(),
			{ model: "gpt-4o" },
			{
				annotations: [
					annotation({ id: "one", range: { from: 0, to: 7 } }),
					annotation({ id: "two", range: { from: 40, to: 47 } }),
				],
				revisions: [],
				activeAnnotationId: "one",
				passes: {},
			},
		);
		await modai.loadSettings();

		await modai.rejectReview("one");

		expect(
			modai.workshopState().annotations.map((entry) => entry.status),
		).toEqual(["rejected", "pending"]);
		expect(modai.workshopState().activeAnnotationId).toBe("two");
	});

	it("reopens a rejected suggestion", async () => {
		const modai = createPlugin(
			fakeVault(),
			{ model: "gpt-4o" },
			{
				annotations: [annotation({ id: "one", status: "rejected" })],
				revisions: [],
				activeAnnotationId: null,
				passes: {},
			},
		);
		await modai.loadSettings();

		await modai.reopenReview("one");

		expect(modai.workshopState().annotations[0]?.status).toBe("pending");
		expect(modai.workshopState().activeAnnotationId).toBe("one");
	});

	it("closes the review when nothing is left", async () => {
		const modai = createPlugin(
			fakeVault(),
			{ model: "gpt-4o" },
			{
				annotations: [annotation({ id: "only" })],
				revisions: [],
				activeAnnotationId: "only",
				passes: {},
			},
		);
		await modai.loadSettings();

		await modai.rejectReview("only");

		expect(modai.workshopState().activeAnnotationId).toBeNull();
	});
});

describe("role commands", () => {
	it("registers one command per role file", async () => {
		const modai = createPlugin(fakeVault(ROLE_FILES), {
			rolesFolder: "Modai roles",
		});

		await modai.refreshRoles();

		expect(modai.roles.map((role) => role.name)).toEqual([
			"Author",
			"Poet",
		]);
		expect(commandIds(modai)).toEqual([
			"modai-role-author",
			"modai-role-poet",
		]);
	});

	it("registers the workshop, custom and role commands on load", async () => {
		const modai = createPlugin(fakeVault(ROLE_FILES), {
			rolesFolder: "Modai roles",
		});

		await modai.onload();

		expect(commandIds(modai)).toEqual([
			"modai-custom",
			"modai-role-author",
			"modai-role-poet",
			"review-next-chunk",
			"suggestion-apply",
			"suggestion-next",
			"suggestion-previous",
			"suggestion-reject",
			"workshop-open",
		]);
		expect(mocks(modai).addRibbonIcon).toHaveBeenCalledTimes(1);
	});

	it("does not register the same role command twice", async () => {
		const modai = createPlugin(fakeVault(ROLE_FILES), {
			rolesFolder: "Modai roles",
		});

		await modai.refreshRoles();
		await modai.refreshRoles();

		expect(mocks(modai).addCommand).toHaveBeenCalledTimes(2);
	});

	it("removes the command of a role whose file is gone", async () => {
		const vault = fakeVault(ROLE_FILES);
		const modai = createPlugin(vault, { rolesFolder: "Modai roles" });
		await modai.refreshRoles();

		delete vault.files["Modai roles/Poet.md"];
		await modai.refreshRoles();

		expect(mocks(modai).removeCommand).toHaveBeenCalledWith(
			"modai-role-poet",
		);
		expect(modai.roles.map((role) => role.name)).toEqual(["Author"]);
	});

	it("registers no role commands without a roles folder", async () => {
		const modai = createPlugin(fakeVault(ROLE_FILES));

		await modai.refreshRoles();

		expect(modai.roles).toEqual([]);
		expect(mocks(modai).addCommand).not.toHaveBeenCalled();
	});
});
