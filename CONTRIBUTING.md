# Contributing to My packages

Thanks for taking the time to help. This guide covers how to ask, report,
suggest and change things, and what a pull request needs before it's merged.

## Code of conduct

Everyone taking part is expected to follow the
[Code of Conduct](CODE_OF_CONDUCT.md). Report unacceptable behaviour to
<code-of-conduct@phun-ky.net>.

## Asking a question

Read the [FAQ](https://mypackages.dev/help/faq) first, and search the
[issues](https://github.com/phun-ky/site-mypackages.dev/issues). If your
question isn't answered there, open an issue and say what you were trying to do.

## Reporting a bug

Open an issue with the bug report template. The site's error page has a "Report
it on GitHub" link that fills in the address, the time, your browser and the
error for you.

Include:

- the page's address, and what you did
- what you expected, and what happened instead
- your browser, and whether you were signed in

**Security issues are different:** don't open an issue. Report them privately,
as the [security policy](SECURITY.md) describes.

## Suggesting a change

Open an issue describing the problem first, then the change you have in mind.
Larger changes, such as a new page, a new data source or anything that stores
more about users, are discussed in the issue before work starts. Issues in this
repository follow a pattern: **Problem**, **Proposal**, **Tests** and **Deploy
impact**, and a decision from the maintainer is recorded in the issue.

## Changing the code

### Setting up

You need Node.js 24 and npm.

```sh
npm ci
npm run dev
```

`npm ci` also sets `core.hooksPath` to `.githooks`, which adds your sign-off to
every commit and refuses AI attribution (see below).

The site reads `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` from
`.env.local` (not committed). Two things keep a local copy from using the
production project:

- the edge functions only answer `https://mypackages.dev`, and
- the Content Security Policy in `index.html` only allows the production
  Supabase host in `connect-src`.

To work against a local Supabase (Docker):

```sh
supabase start
echo 'ALLOW_LOCAL_ORIGIN=true' > supabase/functions/.env
supabase status -o env | sed -n 's/^API_URL=/VITE_SUPABASE_URL=/p; s/^ANON_KEY=/VITE_SUPABASE_ANON_KEY=/p' | tr -d '"' > .env.local
supabase functions serve --env-file supabase/functions/.env
npm run dev
```

Open the site at `http://localhost:5173`, the one origin the local functions
answer. The dev server adds the Supabase URL from `.env.local` to `connect-src`,
so `index.html` stays as it is. npm's data comes from npm itself, which limits
how much it answers without a token.

### Tests are required

Every feature and every fix comes with tests:

- **A fix** has a test that fails without it. Say in the pull request that you
  saw it fail.
- **A feature** has tests for what it does: unit tests (`tests/unit`, with
  [fast-check](https://fast-check.dev) for rules that hold for every input) for
  pure code, and end-to-end tests (`tests/e2e`, Playwright) for pages.
- **Edge functions** have Deno tests next to them, and **the database** has
  pgTAP tests in `supabase/tests`.

The end-to-end tests run against a build with every request mocked, so they
don't need Supabase or the network. Run the files your change touches while you
work; CI runs the whole suite in Chromium.

### Checks

A pull request is merged when the `check` status passes. It requires lint (no
warnings), formatting, the typecheck, the build and its metadata check, the unit
tests with coverage, the end-to-end tests, the edge function checks and the
database tests:

| Command                       | What it checks                                                                     |
| ----------------------------- | ---------------------------------------------------------------------------------- |
| `npm run lint`                | ESLint with no warnings allowed, styles only use colour tokens, no en or em dashes |
| `npm run format:check`        | Prettier                                                                           |
| `npm run typecheck`           | TypeScript, for the source and the tests                                           |
| `npm run test:unit`           | Unit and property tests (`tests/unit`)                                             |
| `npm run test:coverage`       | The unit tests with coverage thresholds                                            |
| `npm run test:e2e`            | Builds with `.env.e2e`, then the Playwright tests in Chromium                      |
| `npm run build`               | The production build                                                               |
| `npm run check:metadata`      | Titles, descriptions, link previews and the sitemap in `dist/`, after a build      |
| `npm run check:bestpractices` | That every link in `.bestpractices.json` and `security-insights.yml` resolves      |

The edge functions are Deno, checked and tested with Deno 2:

```sh
deno check --no-lock supabase/functions/*/index.ts
deno lint --rules-exclude=no-import-prefix,no-explicit-any supabase/functions
DENO_NO_PACKAGE_JSON=1 deno test --no-lock --allow-env --allow-read=supabase/functions supabase/functions
```

`supabase test db` runs the database tests (`supabase/tests`) against a local
database with the migrations applied.

`npm run bestpractices:url -- --level passing` prints
[bestpractices.dev](https://www.bestpractices.dev/projects/16089) links that
propose the answers in `.bestpractices.json` the site doesn't have yet. Nothing
is saved until you review and save each link. The level is `passing`, `silver`
(the default), `gold` or `baseline-1` to `baseline-3`; add `--justifications` to
replace the saved justifications too.

### Images

The link preview images and the icons are rendered from the marks in
`public/logo` by scripts, with the site's fonts and nothing from the network:
`npm run images:logo` and `npm run images:og`. Run them after changing a mark,
the design or the copy, and commit the files.

### Style

- **TypeScript** in `src`, formatted by Prettier and linted by ESLint. Match the
  code around you: its naming, comments and structure.
- **Escape everything** that doesn't come from this code base (npm, GitHub,
  Supabase, the URL) with `escapeHtml` or `escapeAttr` before it goes into a
  template.
- **Colours** come from the tokens in `src/styles/variables.css`, so both themes
  reach everything; `npm run lint` checks it.
- **Write for people:** plain words in the interface, the docs and the commit
  messages, and say what a number means and where it comes from.
- **British English** (colour, behaviour, licence as a noun, -ise endings) in
  the interface, docs, comments and commits. Names an API or a tool defines keep
  their spelling (`color` in CSS, npm's `license` field).
- **No en or em dashes:** use a hyphen, a colon or a comma, or restructure the
  sentence; `npm run lint` checks it.

### Developer Certificate of Origin

Every commit is signed off under the
[Developer Certificate of Origin](https://developercertificate.org): by signing
off, you confirm that you wrote the change or have the right to submit it under
the project's [MIT licence](LICENSE). The hook in `.githooks` adds the
`Signed-off-by` line; without it, use `git commit -s`. A check on every pull
request refuses commits without one.

### Commits and pull requests

Commit messages follow
[Conventional Commits](https://www.conventionalcommits.org) with an emoji, as
`npm run commit` (commitizen) writes them:

| Type        | For                                | Example                                     |
| ----------- | ---------------------------------- | ------------------------------------------- |
| `feat: 🎸`  | Something new for visitors         | `feat: 🎸 Link preview images`              |
| `fix: 🐛`   | A bug fix                          | `fix: 🐛 Keep localStorage from filling up` |
| `test: 💍`  | Tests only                         | `test: 💍 Unit tests with node:test`        |
| `docs: ✏️`  | Documentation only                 | `docs: ✏️ README and contributing guide`    |
| `ci: 🎡`    | Workflows                          | `ci: 🎡 Check external links weekly`        |
| `chore: 🤖` | Tooling, dependencies and the rest | `chore: 🤖 Zero lint warnings`              |

- **One issue per branch and pull request**, with `Closes #<number>` in the
  commit body.
- **The pull request** says what changed, where the issue stands, how to test
  it, and what deploying it means (the site, the edge functions or a migration).
- **Pull requests are merged with a merge commit**, so each commit stays as
  written. Keep a fix and unrelated tooling in separate commits.
- **No AI attribution:** no `Co-Authored-By` trailer naming an AI tool, no
  "Generated with" line, and nothing saying a change was written by AI, in
  commits, pull requests or issues. The `commit-msg` hook and the `check` status
  refuse such commits; the patterns are in `.githooks/ai-attribution`.

### Deploying

There are no versions, tags or changelog: **every merge to `main` deploys.**

The last jobs in [`ci.yml`](.github/workflows/ci.yml) deploy, once every check
has passed, in this order:

1. **Database migrations** in `supabase/migrations` are applied to the Supabase
   project with `supabase db push`. Only new migrations are applied; the push
   fails if the project has one that `supabase/migrations` doesn't.
2. **The edge functions** in `supabase/functions` are deployed.
3. **The site** is built and published to GitHub Pages, with every static route
   written as its own page. Package and user pages are served from `404.html`
   (with status 404), which starts the app.

### Supabase setup

For a new Supabase project:

1. Link it and apply the migrations: `supabase link --project-ref <ref>`, then
   `supabase db push`. They create the tables, row level security, grants, and
   the daily job for the front page's example.
2. In Authentication, enable the GitHub provider, set the site URL to the site's
   origin, and allow the origin followed by `/` as a redirect URL.
3. For the daily example: store the project URL and a secret in Vault
   (`project_url`, `portfolio_snapshot_secret`), and the same secret as the
   function secret `PORTFOLIO_SNAPSHOT_SECRET`
   (`supabase secrets set PORTFOLIO_SNAPSHOT_SECRET=...`).
4. In the GitHub repository, set the secrets `VITE_SUPABASE_URL` and
   `VITE_SUPABASE_ANON_KEY` (the build), and in the `supabase` environment,
   limited to `main`, `SUPABASE_ACCESS_TOKEN` (applying the migrations and
   deploying the functions; no database password is needed). Set the project ref
   in the `supabase-deploy` job in `ci.yml`.
5. Put the project's URL in `connect-src` in `index.html`. For a copy of the
   site on another domain, also change `SITE_ORIGIN` in
   `supabase/functions/_shared/http.ts`, the only origin the functions answer.
