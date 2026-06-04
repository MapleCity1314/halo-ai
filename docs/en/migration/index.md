# Migration Guide

How to upgrade between Halo versions.

## v0.x → v0.y (Future)

This space will document breaking changes and migration steps between Halo versions.

The current version (v0.1.x) is pre-stable. Breaking changes may occur between minor versions. Each will be documented here with step-by-step migration instructions.

---

## Staying Updated

Watch the [GitHub repository](https://github.com/MapleCity1314/halo-ai) for release notes and changelogs.

Each release is published via Changesets with:

- **major** — Breaking changes requiring code updates
- **minor** — New features, backward-compatible
- **patch** — Bug fixes and documentation updates

---

## Current Version

Check your installed version:

```bash
pnpm list @halo-ai/core
```

Or programmatically (when available):

```ts
import { VERSION } from "@halo-ai/core";
console.log(VERSION);
```
