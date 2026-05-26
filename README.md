# github-sane-defaults

Apply repeatable GitHub repository defaults and branch rulesets.

## Install

```sh
npm install -g @dutifuldev/github-sane-defaults
```

Or run without installing:

```sh
npx @dutifuldev/github-sane-defaults plan dutifuldev/scratch
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
github-sane-defaults plan dutifuldev/scratch
```

Apply changes to one repository:

```sh
github-sane-defaults apply dutifuldev/scratch
```

Apply changes to every non-archived repository in an organization:

```sh
github-sane-defaults apply dutifuldev --all
```

The legacy `--org dutifuldev --repo scratch` form is still accepted.

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
