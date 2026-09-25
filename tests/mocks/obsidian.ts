import { vi } from "vitest";

/**
 * Minimal stand-in for the `obsidian` runtime module.
 *
 * The published package only ships type definitions, and the plugin runs
 * inside Obsidian, so `vitest.config.ts` aliases the `obsidian` import to this
 * file (see the `resolve.alias` section there). Exports are added on demand:
 * extend this file when a test pulls in new Obsidian APIs.
 */

/** Records and fakes out every network call made by the plugin. */
export const requestUrl = vi.fn();

export class App {}

export const Platform = {
	isMacOS: false,
	isMobile: false,
	isDesktop: true,
};

export class Plugin {
	app = {} as App;

	addCommand = vi.fn();
	removeCommand = vi.fn();
	addRibbonIcon = vi.fn();
	addStatusBarItem = vi.fn(() => ({
		createSpan: () => ({ setText: vi.fn() }),
	}));
	addSettingTab = vi.fn();
	registerEvent = vi.fn();
	registerView = vi.fn();
	registerEditorExtension = vi.fn();
	loadData = vi.fn(async () => null);
	saveData = vi.fn(async () => undefined);
}

export class PluginSettingTab {
	app: unknown;
	plugin: unknown;
	containerEl = { empty: vi.fn() };
	update = vi.fn();

	constructor(app: unknown, plugin: unknown) {
		this.app = app;
		this.plugin = plugin;
	}
}

/** Obsidian's runtime feature check; assume a current app in tests. */
export const requireApiVersion = vi.fn(() => true);

export class Modal {
	app: unknown;

	constructor(app: unknown) {
		this.app = app;
	}
}

export class Setting {}

export class Notice {
	hide(): void {}
}

export class ButtonComponent {}

export class MarkdownView {}

export abstract class FuzzySuggestModal<T> {
	app: unknown;

	constructor(app: unknown) {
		this.app = app;
	}

	abstract getItems(): T[];
	abstract getItemText(item: T): string;
	abstract onChooseItem(item: T): void;
}

export class TFolder {
	path: string;

	constructor(path = "") {
		this.path = path;
	}
}

export class TFile {
	path: string;

	constructor(path = "") {
		this.path = path;
	}
}

export class ItemView {
	app: unknown;
	containerEl: unknown;
	contentEl = {
		empty: vi.fn(),
		addClass: vi.fn(),
		createDiv: vi.fn(),
	};

	constructor(leaf: unknown) {
		this.containerEl = leaf;
	}
}

/** Mirrors Obsidian's path normalisation closely enough for our prefixes. */
export function normalizePath(path: string): string {
	return path
		.replace(/\\/g, "/")
		.replace(/\/+/g, "/")
		.replace(/^\/+|\/+$/g, "");
}
