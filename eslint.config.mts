import tseslint from 'typescript-eslint';
import obsidianmd from "eslint-plugin-obsidianmd";
import globals from "globals";
import { globalIgnores } from "eslint/config";

export default tseslint.config(
	{
		languageOptions: {
			globals: {
				...globals.browser,
			},
			parserOptions: {
				projectService: {
					allowDefaultProject: [
						'eslint.config.mts',
						'package.json',
						'manifest.json'
					],
				},
				tsconfigRootDir: import.meta.dirname,
			},
		},
	},

	...tseslint.configs.recommended,

	{
		files: ["**/*.ts"],
		rules: {
			...tseslint.configs.recommendedTypeChecked.map(config => config.rules).reduce((acc, val) => ({ ...acc, ...val }), {}),
			"@typescript-eslint/no-floating-promises": "error",
			"@typescript-eslint/no-misused-promises": "error",
			"@typescript-eslint/await-thenable": "error",
			"@typescript-eslint/return-await": ["error", "always"],
		}
	},

	...obsidianmd.configs.recommended,

	{
		rules: {
			"@typescript-eslint/no-empty-function": ["error", { "allow": ["methods"] }],
			"@typescript-eslint/no-inferrable-types": "error"
		}
	},

	globalIgnores([
		"node_modules",
		"dist",
		"esbuild.config.mjs",
		"eslint.config.js",
		"version-bump.mjs",
		"versions.json",
		"main.js",
	]),
);
