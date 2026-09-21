# Changelog

## [3.0.0](https://github.com/hampusadamsson/modai/compare/2.0.0...3.0.0) (2026-09-21)


### ⚠ BREAKING CHANGES

* the per-provider key settings (ChatGPT, Gemini, Llama) are replaced by one token. Saved values are migrated automatically, so nothing has to be re-entered.

### Features

* one reference for every review item, asked for in chunks ([d934624](https://github.com/hampusadamsson/modai/commit/d9346246ab789124829aad7aadd883476d0c7046))
* one token for a much larger provider list ([006fe54](https://github.com/hampusadamsson/modai/commit/006fe5407548221fbc4b3f43d324f482e5ea98f0))
* read the model list from the provider ([80d5c0b](https://github.com/hampusadamsson/modai/commit/80d5c0bdb7c18a6fbb2598cc39de82495422aa4c))
* review suggestions one at a time ([f5d79aa](https://github.com/hampusadamsson/modai/commit/f5d79aadb824304f69d873669fdaf620d1c62c7f))


### Bug Fixes

* keep the shortcut out of button tooltips ([0e5bd78](https://github.com/hampusadamsson/modai/commit/0e5bd78a0d474662840ded42d08544df584705aa))

## [2.0.0](https://github.com/hampusadamsson/modai/compare/1.0.1...2.0.0) (2026-09-20)


### ⚠ BREAKING CHANGES

* role instructions no longer live in the plugin settings. Each role is now a markdown file in a vault folder, the diff modal is replaced by the workshop sidebar, and the plugin requires Obsidian 1.7.2 or newer.

### Features

* workshop sidebar, vault roles and a keyboard-first UI ([186d4cc](https://github.com/hampusadamsson/modai/commit/186d4cc4d39ad584a657fdd8ea3119917b94c097))


### Bug Fixes

* address the community review findings ([8e273c2](https://github.com/hampusadamsson/modai/commit/8e273c2a89f32f9d3bdf0fc61774b437f1497d15))
