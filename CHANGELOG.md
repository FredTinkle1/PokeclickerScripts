# TINKLE AUTOMATION — Changelog

This file records custom changes to this fork of [Farigh/pokeclicker-automation](https://github.com/Farigh/pokeclicker-automation), separately from upstream development. Each entry links to the original commit so its exact changes can be inspected or reverted.

## 2026-11-25 — Custom feature history

Entries are in reverse commit order. Dates identify the development session, not necessarily the Git commit's timezone.

### Standalone Auto Purify

**Added** · [Module](https://github.com/FredTinkle1/PokeclickerScripts/commit/9618b6b21cbbcad3b814023de4469e8a6d20f665) · [Loader](https://github.com/FredTinkle1/PokeclickerScripts/commit/d3ee270c0fa2d90b62de5b4409fcaef3074c6210) · [Menu integration](https://github.com/FredTinkle1/PokeclickerScripts/commit/52fa2cf54b9769a28981eb193b15f038075ae1ce)

- Added a separate Auto Purify toggle immediately below Auto Shop and above Auto Upgrade.
- Disabled by default; persistent setting independent of shopping and focus.
- Uses the native Purify Chamber unlock and flow checks every two seconds, retaining a valid current selection and automatically selecting the next unpurified Shadow Pokémon.
- Does not move the player or change battle, shop or focus settings. Waits for future Shadow Pokémon when none remain.
- Verified API against PokéClicker v0.10.26 source; live game testing pending.

### Achievement region selection
**Added** · [89b77cd](https://github.com/FredTinkle1/PokeclickerScripts/commit/89b77cdcf21651bc2a8a9691fbe4a95eacf82638) · `src/lib/Focus/Achievements.js`

- Added persistent individual region/category checkboxes to Focus → Advanced Settings → Achievements, with Select all and Clear all.
- All regions are enabled by default. Targets are filtered by selected regions and retain the existing region ordering and achievement type/quantity priorities.
- Region changes trigger target reselection; active dungeon runs are intended to finish before retargeting.
- Special categories (e.g. Sevii Islands, Orre, Magikarp Jump) can be selected independently when present.
- Stops focus when no eligible, accessible achievements remain in selected regions.

### Shiny tracker layout fix
**Fixed** · [2806ffc](https://github.com/FredTinkle1/PokeclickerScripts/commit/2806ffc9d7328c5fdaa4b0f65d72f6721c46f199) · `src/lib/Focus.js`

- Moved the shiny tracker out of the right-side automation menu into a fixed, collapsible panel on the far left.
- Prevents the tracker from expanding the automation menu's layout and separates it from advanced-settings popouts.
- Added a 240px panel, scrollable list, better name/status wrapping and region-title deduplication.

### Loader diagnostics and cache busting
**Fixed / Changed** · [3d3207d](https://github.com/FredTinkle1/PokeclickerScripts/commit/3d3207dd98d8be0040270af0c0575e575f3f18fa) · `src/ComponentLoader.js`

- Added a per-session cache-busting query parameter for component requests.
- Added syntax pre-checks, component-specific download/load logs and startup error reporting.
- Preserved existing dependency loading batches.

### Global storage startup fix
**Fixed** · [58aee4e](https://github.com/FredTinkle1/PokeclickerScripts/commit/58aee4e1e6883a86e84f5afef7864cdb4800c7bc) · `src/lib/Utils/LocalStorage.js`

- Restored the missing class-closing brace from the initial global-storage edit.
- Fixed the syntax error that prevented utility and automation initialization; retained settings migration.

### Shiny hunting focus
**Added** · [493fee3](https://github.com/FredTinkle1/PokeclickerScripts/commit/493fee36f90bfaa1cd307f0ffe7530642df3b703) · `src/lib/Focus.js`

- Added Shinies to the Focus dropdown.
- Scans accessible routes in region and route-number order, skipping routes with no missing ordinary encounter shinies. Roaming encounters are excluded from completion.
- Enables Auto attack, checks shiny ownership every three seconds, advances automatically and stops focus when no eligible routes remain.
- Added route name, caught/missing list, shiny sprites and progress bar. Capture filters remain user-controlled.
- Initial inline panel was subsequently replaced by the far-left overlay above.

### Global persistent settings
**Changed** · [3598c85](https://github.com/FredTinkle1/PokeclickerScripts/commit/3598c85b3cf4349f7adcde96fe6bf200aaaa1cbd) · `src/lib/Utils/LocalStorage.js`

- Switched automation settings from save-specific keys to shared `Automation-Global-` keys.
- Migrates existing save-specific values when the global value is absent.
- Settings are shared across saves and refreshes on the same browser/site; not synced across devices.
- Initial commit had a missing closing brace, corrected in 58aee4e.

### Manual berry targeting
**Added** · [4dc4f8b](https://github.com/FredTinkle1/PokeclickerScripts/commit/4dc4f8b474d6982e3f1824291db9929c2de2fe65) · `src/lib/Farm.js`

- Added Target berry (farm / mutate) dropdown with an automatic/normal farming option.
- Manual targeting is independent of the automatic unlock toggle.
- Reuses existing mutation strategies and recursively resolves missing parent berries where supported.
- Stores the target selection, reports requirements and aims to farm the selected berry after unlocking it.

## Local Tampermonkey changes (not verified as repository commits)

- Redirected the userscript loader to FredTinkle1/PokeclickerScripts.
- Added loader cache busting and diagnostics; temporarily pinned commit 3d3207d for startup troubleshooting, then returned to master for future updates.
- Requested branding: `// @name         TINKLE AUTOMATION` for future userscript updates.

These local installation changes are documented here for completeness; they are not attributed to a source commit unless a matching committed file is verified.

## Development conventions

- Use descriptive commit titles (e.g. `feat(focus): add shiny region selection`, `fix(ui): prevent tracker overlap`).
- Keep each logical feature or fix in its own commit; include a description of behavior and relevant testing or limitations.
- Update this changelog for each user-facing change, linking the corresponding commit when available.
- Use version tags/releases for tested milestones if desired; do not rewrite published history just to rename older commits.
- Preserve upstream attribution and TINKLE AUTOMATION branding in future userscript updates.

## Verification

Historical entries were reconstructed from seven custom commit diffs and prior development discussions. They describe implemented or intended behavior, not a certification that every feature has been tested in the live game. No source code was modified as part of this changelog.
