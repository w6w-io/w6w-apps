/**
 * Is respond.io up?
 *
 * respond.io publishes a status page at **`status.respond.io`**, verified live
 * 2026-09-05. It self-identifies (`<title>Respond.io Status</title>`) and is
 * genuinely respond.io's own (cookie `pd_status_page_version`, a PagerDuty-
 * hosted status page — a different product from Atlassian's Statuspage.io,
 * which is what most other apps in this pack read). But it renders **entirely
 * client-side**, and every path this pack's Statuspage/status.io/Instatus apps
 * read answers byte-identical HTML:
 *
 * | Path                     | Status | Bytes | md5 (first 12) |
 * | ------------------------ | ------ | ----- | --------------- |
 * | `/` (the page itself)    | 200    | 6883  | `f18164268dd9`   |
 * | `/index.json`            | 200    | 6883  | `f18164268dd9`   |
 * | `/history.atom`          | 200    | 6883  | `f18164268dd9`   |
 * | `/history.rss`           | 200    | 6883  | `f18164268dd9`   |
 * | `/feed.rss`              | 200    | 6883  | `f18164268dd9`   |
 * | `/data.json`             | 200    | 6883  | `f18164268dd9`   |
 * | `/nonexistent-path-xyz`  | 200    | 6883  | `f18164268dd9`   |
 *
 * A made-up path answering identically to the "real" ones is the SPA-catch-all
 * signature this pack's own `canny`/`checkly` apps document — there is no
 * server-side route at all, only a client bundle that presumably calls a
 * separate API at runtime. The one path that DOES differ,
 * `/api/v2/summary.json` (the Statuspage-shaped path other apps use), answers
 * a genuine `404` — `Cannot GET /api/v2/summary.json` — proving the SPA-shell
 * responses above are not simply "every path 200s", and that this really is
 * "no machine-readable route exists," not a probing mistake.
 *
 * So this is a declared absence, not a gap: `severity: "informational"` is
 * load-bearing, since an `unavailable` entry always reports `unknown`, which
 * outranks `ok` in a roll-up — at any other severity this would pin the App's
 * verdict at `unknown` forever. The derived `auth:api-token` check (from
 * `../auth/api-token.ts`'s `test` hook, `GET /space/user?limit=1`) is the
 * automatable signal for "is respond.io working" for anyone with a live token.
 */
import type { HealthCheckDefinition } from "@w6w/types";

const service: HealthCheckDefinition = {
  key: "service",
  title: "respond.io platform status",
  kind: "service",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason:
      "status.respond.io is a genuine, self-identifying PagerDuty-hosted status page, but it " +
      "renders entirely client-side: every Statuspage/RSS/Atom-shaped path (and a made-up one) " +
      "answers the identical 6,883-byte HTML shell, while the one truly-nonexistent path 404s — " +
      "confirmed live 2026-09-05. No JSON/RSS/Atom feed is reachable without executing its JS. " +
      "The auth:api-token check (GET /space/user?limit=1) is the automatable signal.",
  },
};

export default service;
