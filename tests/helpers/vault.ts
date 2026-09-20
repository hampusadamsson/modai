import { vi } from "vitest";

/** Vault stub holding a set of markdown files by path. */
export function fakeVault(files: Record<string, string> = {}) {
	const store: Record<string, string> = { ...files };

	return {
		/** Mutable file set, so a test can add or delete a role file. */
		files: store,
		on: vi.fn(() => ({})),
		getMarkdownFiles: () => Object.keys(store).map((path) => ({ path })),
		cachedRead: async (file: { path: string }) => store[file.path] ?? "",
	};
}
