# mypackages.dev

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="./public/logo/banner-dark.png">
  <img alt="My packages: see how your npm packages are really doing: downloads, releases and health, from npm’s own data" src="./public/logo/banner-light.png">
</picture>

[![OpenSSF Scorecard](https://api.scorecard.dev/projects/github.com/phun-ky/site-mypackages.dev/badge)](https://scorecard.dev/viewer/?uri=github.com/phun-ky/site-mypackages.dev)
[![OpenSSF Best Practices](https://www.bestpractices.dev/projects/16089/badge)](https://www.bestpractices.dev/projects/16089)

[My packages](https://mypackages.dev) shows how npm packages, and the people who
maintain them, are doing: downloads month by month, releases, and a health score
for each package. Search any package or npm user; no account needed.

## What it shows

- **A package** (`/packages/<name>`, scoped names too): downloads for the last
  12 complete months, release history, dependencies, and a health score from
  maintenance, quality, security, popularity and provenance, with the reason for
  each.
- **A user** (`/users/<npm username>`): every package they maintain, with
  totals, what needs attention, what is doing well, and the packages by scope or
  in a table.
- **What people look up** (`/packages`, `/users`): the most looked up packages
  and users, and the latest lookups.
- **Signed in** (with GitHub): a dashboard of your own packages, and an npm
  token the site can use for you, so npm's rate limits hit less often.

## Where the numbers come from

| Data                                   | Source                                                                                        |
| -------------------------------------- | --------------------------------------------------------------------------------------------- |
| Package details, versions, maintainers | The npm registry, through the site's edge functions                                           |
| Which packages a user maintains        | npm's search, `maintainer:<username>`                                                         |
| Downloads                              | The [npm downloads API](https://github.com/npm/registry/blob/main/docs/download-counts.md)    |
| Vulnerabilities                        | [OSV](https://osv.dev)                                                                        |
| Stars, forks and issues                | GitHub, GitLab, Bitbucket or Azure DevOps, for the package's repository                       |
| OpenSSF Best Practices badge           | [bestpractices.dev](https://www.bestpractices.dev), for the package's repository              |
| Which packages depend on a package     | [ecosyste.ms](https://packages.ecosyste.ms), and npm's search for the count where it's higher |

The [FAQ](https://mypackages.dev/help/faq) explains how each number is counted.

### Limits

- **npm's data lags.** Download counts run to a day or two ago, so "last month"
  is the last complete calendar month, and the current month is never shown as
  complete.
- **Up to 500 packages per user.** npm's search gives 250 at a time; the site
  loads two pages and says so when a user has more.
- **Maintained, not authored.** A user's packages are the ones they maintain on
  npm. npm records the latest publisher as the author, which with trusted
  publishing is GitHub Actions.
- **Rate limits.** npm limits how much the site can fetch, more for signed-out
  visitors. Signing in and adding an npm token helps.
- **Cached in the browser.** Responses are kept in localStorage for up to a day;
  "Refresh data" on a user page fetches them again.

## Development

You need Node.js 24 and npm.

```sh
npm ci
npm run dev        # http://localhost:5173
npm run test:unit
npm run build
```

The [contributing guide](CONTRIBUTING.md) explains running it against a local
Supabase, every check, how the site deploys and how to set up a Supabase
project.

## More

- [Contributing](CONTRIBUTING.md): how to propose a change, and the checks it
  needs
- [Security policy](SECURITY.md): how to report a vulnerability
- [Privacy](PRIVACY.md): what the site stores, for how long, and how to delete
  it
- [Assurance case](ASSURANCE.md): the threat model, and how the site is
  protected and tested
- [Governance](GOVERNANCE.md) and [roadmap](ROADMAP.md)

## Licence

© Alexander Vassbotn Røyne-Helgesen

- **The code**, everything not listed below: [MIT](LICENSE).
- **The logo, icons and images**:
  [CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/). That is
  `public/logo.svg` and the files in `public/logo`, `public/meta` and
  `public/images`, and `public/nebula*`. You may share and adapt them, not
  commercially, with credit, and under the same licence.

The Creative Commons badge in `public/meta/cc-by-nc-sa-4.0-88x31.png` is
Creative Commons' own.

## Sponsor me

I'm an Open Source evangelist, creating stuff that does not exist yet to help
get rid of secondary activities and to enhance systems already in place, be it
documentation or web sites.

The sponsorship is an unique opportunity to alleviate more hours for me to
maintain my projects, create new ones and contribute to the large community
we're all part of :)

[Support me on GitHub Sponsors](https://github.com/sponsors/phun-ky).
