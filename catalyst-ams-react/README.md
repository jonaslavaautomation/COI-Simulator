# Catalyst AMS React trainer

React/TypeScript rebuild of the QQCatalyst AMS create-a-COI workflow trainer,
using the same scenario data and grading engine as the rest of this repo
(`src/data/scenarios/`, ported from the top-level `scenarios/` folder).

## Development

```
npm install
npm run dev
```

## Building the deployed page

This app is opened directly via `file://` (double-click, no server), same as
every other trainer page in this repo, so the build must produce a single
self-contained HTML file - a normal Vite build's `<script type="module">`
is blocked by CORS under `file://`. `vite-plugin-singlefile` (configured in
`vite.config.ts`) inlines the JS/CSS into one file instead.

```
npm install
npm run build
```

This outputs `dist/index.html` (everything inlined) plus `dist/acord25-template.png`
(the one asset left as a separate file, matching how the other trainer pages
in this repo reference that same image).

To publish a new build as the repo's `ams-qqcatalyst.html`, copy
`catalyst-ams-react/dist/index.html` over `../ams-qqcatalyst.html` at the repo
root. The `acord25-template.png` the built page references already exists at
the repo root and is byte-identical to the one copied into `dist/` - no need
to duplicate it.
