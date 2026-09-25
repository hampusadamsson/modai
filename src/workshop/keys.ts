/** Everything the workshop panel can do from the keyboard. */
export type WorkshopAction =
	| "next"
	| "previous"
	| "first"
	| "last"
	| "apply"
	| "reject"
	| "openInEditor"
	| "nextDocument"
	| "previousDocument"
	| "clear"
	| "help"
	| "escape";

export interface KeyBinding {
	/** Keys that trigger the action, the primary key first. */
	keys: string[];
	action: WorkshopAction;
	/** Shown in the key map and on buttons. */
	label: string;
}

/**
 * Vim flavoured bindings for the panel. The panel has no text inputs, so plain
 * letters are free: `j`/`k` move, `a`/`r` decide, `[`/`]` switch document.
 */
export const KEY_BINDINGS: KeyBinding[] = [
	{ keys: ["j", "ArrowDown"], action: "next", label: "next review item" },
	{
		keys: ["k", "ArrowUp"],
		action: "previous",
		label: "previous review item",
	},
	{ keys: ["g"], action: "first", label: "first review item" },
	{ keys: ["G"], action: "last", label: "last review item" },
	{ keys: ["a"], action: "apply", label: "apply review item" },
	{ keys: ["r"], action: "reject", label: "reject review item" },
	{ keys: ["o"], action: "openInEditor", label: "open in editor" },
	{ keys: ["]"], action: "nextDocument", label: "next document" },
	{ keys: ["["], action: "previousDocument", label: "previous document" },
	{ keys: ["x"], action: "clear", label: "clear done" },
	{ keys: ["?"], action: "help", label: "key map" },
	{ keys: ["Escape"], action: "escape", label: "dismiss" },
];

export interface KeyEventLike {
	key: string;
	ctrlKey?: boolean;
	metaKey?: boolean;
	altKey?: boolean;
	shiftKey?: boolean;
}

/**
 * Action for a key press. Modified keys are left to Obsidian, so the panel
 * never swallows a user's own shortcuts.
 */
export function actionForKey(event: KeyEventLike): WorkshopAction | null {
	if (event.ctrlKey || event.metaKey || event.altKey) return null;

	for (const binding of KEY_BINDINGS) {
		if (binding.keys.includes(event.key)) return binding.action;
	}

	return null;
}

/** Primary key of an action, for buttons and hints. */
export function keyFor(action: WorkshopAction): string {
	return (
		KEY_BINDINGS.find((binding) => binding.action === action)?.keys[0] ?? ""
	);
}

/** Label of an action, for buttons and the key map. */
export function labelFor(action: WorkshopAction): string {
	return (
		KEY_BINDINGS.find((binding) => binding.action === action)?.label ?? ""
	);
}

/** Keys of an action, primary key first. */
export function keysFor(action: WorkshopAction): string[] {
	return (
		KEY_BINDINGS.find((binding) => binding.action === action)?.keys ?? []
	);
}
