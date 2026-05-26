# AGENTS.md

These instructions apply to this repository.

## Slophammer Standards

This repository follows the TypeScript guidance from
`dutifuldev/slophammer/docs/AGENT_ENTRYPOINT.md`.

## Local Checks

Before finishing a change, run:

```sh
npm run format
npm run lint
npm run typecheck
npm test
npm run coverage
npm run build
npx -y @simpledoc/simpledoc check
git diff --check
```

`npm run check` runs the formatter, linter, type checker, tests, coverage, and
build.

## TypeScript Rules

- Keep `strict: true` and related strict compiler options enabled.
- Do not use explicit `any`.
- Validate unknown GitHub API responses at the boundary before using them.
- Keep planning logic independent from network IO.
- Add or update focused tests for every behavior change.

## Dependencies

Avoid runtime dependencies unless they remove meaningful complexity. Prefer the
Node.js standard library and GitHub REST APIs for this CLI.
