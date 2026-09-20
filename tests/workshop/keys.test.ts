import { describe, expect, it } from "vitest";
import {
	KEY_BINDINGS,
	actionForKey,
	keyFor,
	keysFor,
	labelFor,
} from "../../src/workshop/keys";

describe("actionForKey", () => {
	it("maps the vim keys the panel advertises", () => {
		expect(actionForKey({ key: "j" })).toBe("next");
		expect(actionForKey({ key: "k" })).toBe("previous");
		expect(actionForKey({ key: "g" })).toBe("first");
		expect(actionForKey({ key: "G" })).toBe("last");
		expect(actionForKey({ key: "a" })).toBe("apply");
		expect(actionForKey({ key: "r" })).toBe("reject");
		expect(actionForKey({ key: "m" })).toBe("toggleMajor");
		expect(actionForKey({ key: "o" })).toBe("openInEditor");
		expect(actionForKey({ key: "]" })).toBe("nextDocument");
		expect(actionForKey({ key: "[" })).toBe("previousDocument");
		expect(actionForKey({ key: "x" })).toBe("clear");
		expect(actionForKey({ key: "?" })).toBe("help");
		expect(actionForKey({ key: "Escape" })).toBe("escape");
	});

	it("keeps the arrow keys as aliases", () => {
		expect(actionForKey({ key: "ArrowDown" })).toBe("next");
		expect(actionForKey({ key: "ArrowUp" })).toBe("previous");
	});

	it("leaves modified keys to Obsidian", () => {
		expect(actionForKey({ key: "j", ctrlKey: true })).toBeNull();
		expect(actionForKey({ key: "j", metaKey: true })).toBeNull();
		expect(actionForKey({ key: "j", altKey: true })).toBeNull();
		expect(actionForKey({ key: "Enter", ctrlKey: true })).toBeNull();
	});

	it("ignores keys that are not bound", () => {
		expect(actionForKey({ key: "z" })).toBeNull();
		expect(actionForKey({ key: "A" })).toBeNull();
		expect(actionForKey({ key: "Enter" })).toBeNull();
	});
});

describe("key map", () => {
	it("binds every action exactly once", () => {
		const actions = KEY_BINDINGS.map((binding) => binding.action);

		expect(new Set(actions).size).toBe(actions.length);
	});

	it("gives every action at least one key and a label", () => {
		for (const binding of KEY_BINDINGS) {
			expect(binding.keys.length).toBeGreaterThan(0);
			expect(binding.keys[0]).not.toBe("");
			expect(binding.label).not.toBe("");
		}
	});

	it("reports the primary key of an action", () => {
		expect(keyFor("next")).toBe("j");
		expect(keyFor("apply")).toBe("a");
		expect(keysFor("next")).toEqual(["j", "ArrowDown"]);
		expect(labelFor("reject")).toBe("reject suggestion");
	});
});
