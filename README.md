# github-sane-defaults

Apply repeatable GitHub repository defaults and branch rulesets.

`github-sane-defaults` is a small CLI for keeping repository settings
consistent across one GitHub repository or an entire organization. It previews
the changes it would make, then applies the same policy through GitHub's REST
API when you are ready.

The default policy is intentionally narrow. It turns on the GitHub merge and
cleanup settings that keep pull request history tidy, and it creates a default
branch ruleset that blocks deletion, blocks force pushes, and requires linear
history. The CLI manages its own named ruleset, so repeated runs are
idempotent and easy to review.

Use `plan` first to see drift, then switch to `apply` to make the changes.
Both commands accept `owner/repo` targets and organization-wide `--all` runs.

## Install

```sh
npm install -g github-sane-defaults
```

Or run without installing:

```sh
npx github-sane-defaults plan example-org/example-repo
```

### Ask your coding agent (recommended)

Copy this block into your coding agent to audit existing GitHub repositories.

```text
Use github-sane-defaults to inspect my existing GitHub repositories.

Attention agent: start here:
https://github.com/dutifuldev/github-sane-defaults#readme

Ask me for the target org or owner/repo list, then run plan only. Show which
repos need branch protection rulesets, deletion/force-push protection, linear
history, or GitHub merge and cleanup settings enabled. Do not apply changes
unless I ask.
```

## Authentication

The CLI reads tokens in this order:

1. `--token`
2. `GITHUB_TOKEN`
3. `GH_TOKEN`
4. `gh auth token`

The token must have repository administration access for the target
repositories.

## Usage

Preview changes for one repository:

```sh
github-sane-defaults plan example-org/example-repo
```

Apply changes to one repository:

```sh
github-sane-defaults apply example-org/example-repo
```

Apply changes to every non-archived repository in an organization:

```sh
github-sane-defaults apply example-org --all
```

The legacy `--org example-org --repo example-repo` form is still accepted.

## Defaults

Repository settings:

- merge commits disabled
- squash merge enabled
- rebase merge enabled
- auto-merge enabled
- update branch button enabled
- delete branch on merge enabled
- squash commit title set to GitHub's commit-or-pull-request-title default
- squash commit message set to GitHub's commit-messages default

Default branch ruleset:

- block branch deletion
- block force pushes
- require linear history

The ruleset is named `github-sane-defaults: default branch` and targets the
repository default branch.

If that managed ruleset already has additional rules, `apply` preserves them
and only adds missing default protections. Rulesets with other names are left
untouched.

## Development

```sh
npm install
npm run check
```
