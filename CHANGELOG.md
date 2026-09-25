# Changelog

## [3.1.3](https://github.com/hampusadamsson/modai/compare/3.1.2...3.1.3) (2026-09-25)


### Bug Fixes

* drop console log, satisfy no-console rule ([39dff41](https://github.com/hampusadamsson/modai/commit/39dff4139d8db6ab07b31da8f3ad269ce3a68be6))
* log sent headers with masked session ([35702a8](https://github.com/hampusadamsson/modai/commit/35702a85978ec8ed516a92992352081e7cc78be3))
* send stream usage option, log request shape ([1d21615](https://github.com/hampusadamsson/modai/commit/1d21615340079621f9f77d4c596713455ca731d0))
* send UUID session id Go gateway requires ([7b6af0d](https://github.com/hampusadamsson/modai/commit/7b6af0db25cdfb39be78be9684a6744efaed1cc8))

## [3.1.2](https://github.com/hampusadamsson/modai/compare/3.1.1...3.1.2) (2026-09-25)


### Bug Fixes

* match validated Go shape, stream without temperature ([ffaa79c](https://github.com/hampusadamsson/modai/commit/ffaa79cf20fd117f2ec684d3b427729d734d72f1))

## [3.1.1](https://github.com/hampusadamsson/modai/compare/3.1.0...3.1.1) (2026-09-25)


### Bug Fixes

* fetch-first transport keeps gateway error body ([cbac9c7](https://github.com/hampusadamsson/modai/commit/cbac9c71905582dc3719284a58f4722ec0c762de))

## [3.1.0](https://github.com/hampusadamsson/modai/compare/3.0.3...3.1.0) (2026-09-25)


### Features

* allow reopening reviewed items back to pending ([a40c0f4](https://github.com/hampusadamsson/modai/commit/a40c0f481a4151f4133054c9d8eb622c9ca5a252))
* make workshop panel click-only, drop key mappings ([03b29c4](https://github.com/hampusadamsson/modai/commit/03b29c471033b91910ecef8ab528218cfc59b17d))
* remove major flag from workshop ([c26a67f](https://github.com/hampusadamsson/modai/commit/c26a67fe6e7e5d421d54e56787548d6cfccc7424))
* run roles and pick models from sidebar ([7b2e03a](https://github.com/hampusadamsson/modai/commit/7b2e03aa475bf43050cd58f4ad2ebfb5841e8841))


### Bug Fixes

* drop speculative Go session headers, match validated client shape ([82a7480](https://github.com/hampusadamsson/modai/commit/82a748019ad2c9532d2357f70b2cbf09879d3d6d))

## [3.0.3](https://github.com/hampusadamsson/modai/compare/3.0.2...3.0.3) (2026-09-25)


### Bug Fixes

* send Go session headers for chat completions ([012bc0e](https://github.com/hampusadamsson/modai/commit/012bc0e4dda149eef14de1b959583a406b29f6ba))

## [3.0.2](https://github.com/hampusadamsson/modai/compare/3.0.1...3.0.2) (2026-09-25)


### Bug Fixes

* correct OpenCode Go endpoint, normalize base URL, surface POST URL on failure ([c999ca9](https://github.com/hampusadamsson/modai/commit/c999ca9be7ddfede31c784c82e471f2f7bdde907))
* make base URL normalizer private for knip ([7db2b99](https://github.com/hampusadamsson/modai/commit/7db2b992e538e48d7d6e5dec324db48bf4670968))

## [3.0.1](https://github.com/hampusadamsson/modai/compare/3.0.0...3.0.1) (2026-09-21)


### Bug Fixes

* add OpenCode Go provider alongside Zen ([dd3e20e](https://github.com/hampusadamsson/modai/commit/dd3e20e291531cb88096df2f01d0842b1c3157ca))
* issues with hotkeys ([86fbd30](https://github.com/hampusadamsson/modai/commit/86fbd302d6f8e5378057b11216529382aa945483))

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
