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
- squash commit title set to the pull request title
- squash commit message set to the pull request body

Default branch ruleset:

- block branch deletion
- block force pushes
- require linear history

The ruleset is named `github-sane-defaults: default branch` and targets the
repository default branch.

## Development

```sh
npm install
npm run check
```
