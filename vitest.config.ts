import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const root = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
	test: {
		environment: "node",
		include: ["tests/**/*.test.ts"],
		clearMocks: true,
	},
	resolve: {
		alias: {
			// The `obsidian` package only ships types; the runtime is Obsidian itself.
			obsidian: `${root}tests/mocks/obsidian.ts`,
			// `src` is the TypeScript `baseUrl`, so source files import each other
			// by top-level folder name instead of by relative path.
			roles: `${root}src/roles.ts`,
			prompt: `${root}src/prompt.ts`,
			modals: `${root}src/modals`,
			providers: `${root}src/providers`,
			workshop: `${root}src/workshop`,
		},
	},
});
