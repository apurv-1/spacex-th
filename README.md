# SpaceX launches

A small viewer for SpaceX launch records.
It reads the v4 launches query API and renders mission name, rocket name, launch date, details, and the patch thumbnail.

## Run

```bash
bun install
bunx playwright install chromium
bun run dev
```

Open http://127.0.0.1:5173.

`bun run test` runs the unit tests.
`bun test` is Bun's own runner and does not pick these up.
`bun run test:e2e` runs the browser test against the mock server.
`bun run build` typechecks and builds the static app.

## API

The client talks to `GET /v4/rockets` and `POST /v4/launches/query`.
`bun run dev` starts a local mock of those two routes and proxies `/v4` to it.
The live SpaceX host was returning Cloudflare 525 errors on 22 Oct 2026, so the mock is the default.

Point the app at the live API with:

```bash
VITE_SPACEX_API_BASE=https://api.spacexdata.com/v4 bun run dev
```

The value is read at dev-server and build time.
`bun run preview` also starts the mock, because a production build still requests `/v4` unless you set the live base URL before building.

## Paging

Launches are newest first, three per page.
The first page loads on its own.
The Load more button requests pages 2 through 10.
Once 10 pages are on screen, the button goes away and further pages load when the bottom of the list reaches the viewport.
A rocket filter resets the list to page 1.
The filter options come from the rockets endpoint.

Dates are formatted in UTC, so a launch at `2014-09-07T02:00:00Z` reads `Sep 07 2014`.

## Cache

Launch pages and the rocket list use a hand-rolled cache-then-network policy.
Apollo's documented name for this policy is `cache-and-network`.
The brief calls it `cache-then-network`.
If a page is cached, it is rendered immediately, a network request still runs, and the table is replaced with the response.
A failed refresh keeps the cached rows and shows an error.
The cache lives in memory for the life of the page.
The cache is hand-rolled so that behavior sits in one module instead of behind Apollo Client.

The thumbnail column is `links.patch.small` on the v4 launch document.

## Mock data

The fixture is a snapshot of recent SpaceX launches from Launch Library 2, mapped into the v4 document shape, plus the five historical Falcon 1 flights.
The snapshot stores a Launch Library image in `links.patch.small` because the SpaceX API host was down, so those images are photos rather than official mission patches.
Falcon 1 rows have no thumbnail.
The mock implements filter, sort, pagination, and rocket populate for the query this app sends.
It does not implement the rest of the v4 query language.

## Tests

Unit tests cover the cache policy, the page-mode switch, the response mapping, and the mock query.
The browser test checks the first page, clicks Load more through page 10, scrolls for the next page, and filters to Falcon 1.
