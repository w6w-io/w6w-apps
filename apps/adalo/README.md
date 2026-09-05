# Adalo

Read and write records in an Adalo app's Collections via the Adalo Collections API.

- **Categories** — developer-tools, databases
- **Auth methods** — api-key (bearer)
- **Actions** — 5
- **Egress allowlist** — `api.adalo.com`
- **Website** — https://www.adalo.com
- **API docs** — https://help.adalo.com/integrations/the-adalo-api ,
  https://help.adalo.com/integrations/the-adalo-api/collections

## Every action needs an App ID *and* a Collection ID

Adalo's Collections API is scoped per-app: every request path is
`https://api.adalo.com/v0/apps/{appId}/collections/{collectionId}[/{recordId}]`. The
**App ID** is collected once, at connect time, as part of the `api-key` Auth method — it's
paired 1:1 with the API key anyway, since an Adalo API key is generated inside one specific
app and only works for that app. The **Collection ID** varies within an app (every app has
several Collections), so it's a required param on every action instead.

Neither ID is discoverable through the API itself — see "The gaps this API has" below.
Get both the same way you get the key: open the app in the Adalo builder, click the three
dots beside a Collection's name, choose **API Documentation**, and read the App ID and
Collection ID out of the generated sample request's URL.

## Actions

All paths are relative to `https://api.adalo.com/v0/apps/{appId}`.

| Key | Resource | Method + path |
|---|---|---|
| `list-records` | record | `GET /collections/{collectionId}` |
| `get-record` | record | `GET /collections/{collectionId}/{recordId}` |
| `create-record` | record | `POST /collections/{collectionId}` |
| `update-record` | record | `PUT /collections/{collectionId}/{recordId}` |
| `delete-record` | record | `DELETE /collections/{collectionId}/{recordId}` |

`create-record` / `update-record` take a `fields` JSON object of the Collection's own
field slug → value (e.g. `{ "Name": "Ada", "Score": 10 }`) — Adalo defines no fixed
schema, since every app's Collections differ, so this stays free-form rather than a fixed
field list.

`list-records` supports `offset`/`limit` pagination and single-property filtering via
`filterKey`/`filterValue` query params. **Filtering only works on single-value properties**
(Number, Text, Boolean, Date) — a Relationship property comes back as an **array** of ids
and can never match a `filterKey`/`filterValue` pair. The vendor's own doc gives the
workaround: mirror the relationship into a plain Number/Text field on the record and
filter on that instead.

## Auth

**api-key** (`bearer`) — two fields collected at connect time:

- **App ID** — the id in the Adalo builder URL (`app.adalo.com/apps/<app_id>/...`).
- **API Key** — Settings → App Access → Generate API Key (also visible in any
  Collection's "API Documentation" panel, in the sample cURL after `Bearer`).

Every request signs with `Authorization: Bearer <apiKey>`. Requires the Adalo **Team or
Business** plan — a lower plan's requests fail (see Error Codes below).

### `test`

Adalo exposes no app-wide or credential-only endpoint — the *only* real route is
`/collections/{collectionId}` (confirmed live: `GET /v0/apps/{appId}/collections` with no
id, and `GET /v0/apps/{appId}` alone, both 404 as unregistered routes), so `test` calls
that route with a fixed placeholder Collection ID (`w6w-connectivity-check`) rather than
a real one. This is safe because Adalo checks the **credential** before it checks whether
the collection exists — confirmed live: a bogus Bearer token against that same placeholder
id still comes back `401 {"error":"Invalid access token"}`, not a "collection not found"
error. So getting *any* response other than that specific auth-error shape (or a 403 —
see below) means the App ID + API key pairing is good, whether or not the placeholder
collection is real.

`test` classifies the response by its **body**, never by status code alone:

- `401` / body `{"error":"Invalid access token"}` → credential rejected.
- `403` → reported as a distinct "plan / quota / permission" problem, not a bad key (see
  Error Codes below) — the vendor's own troubleshooting doc documents this as a separate
  failure mode from a bad token.
- Anything else (`200`, or a 404-shaped "no such collection") → `ok: true`.

## Health check

Three different questions get confused with each other, so this section keeps them apart:
is the *vendor* up, is *this credential* live, and do we have *quota* left.

### Is the vendor up?

**Service status** — a custom-built page at `status.adalo.com` (Vercel-hosted, **not**
Statuspage-shaped — confirmed live: `adalo.statuspage.io` answers `401 "Your page is
inactive"`, the standard unclaimed-Statuspage decoy).

```
GET https://status.adalo.com/api/v2/components.json
```

`summary.json` also exists but is page-level only (`{"page":{"status":"UP"}}`, no
components) — useless for telling "the app editor is down" apart from "the Collections
API is down". `components.json` is a real, nested component tree that names a component
literally **"Collections API"** ("This service handles all of your requests to the
Collections API. If this is down, your requests to this API will fail."), nested under a
`Published Apps` group, separate from `App Editing` and `Publishing` (the Adalo *builder*
surfaces, which this app never calls). The check walks the tree for that one component by
name and ignores every sibling. `incidents.json` 404s — this page carries no incident
history, only current component state.

Only the `OPERATIONAL` state has been observed live (the page was all-green at
verification time), so the check's status vocabulary (`DEGRADED_PERFORMANCE`,
`PARTIAL_OUTAGE`, `UNDER_MAINTENANCE`, `MAJOR_OUTAGE`) is inferred from this being the
same custom vocabulary shape as Statuspage/Instatus pages elsewhere in this pack, not
confirmed against a live incident. Anything unrecognized reports `unknown` rather than
being guessed at.

The check is unsigned (`credential: "none"`) and `status.adalo.com` is reachable **only
inside this hook's worker** — it is deliberately absent from `w6w.network.allow`.

### Is this credential live?

This is what `auth/api-key.ts`'s `test` hook does — see above.

### Do we have quota left?

**Declared unavailable.** Adalo publishes no headroom endpoint and returns no
rate-limit-shaped header on any response (checked live, unsigned and with a bogus Bearer
token — neither carries anything matching `*ratelimit*` or `retry-after`). The docs state
a fixed **5 requests/second** limit per app (429 on excess), and separately meter "App
Actions" per billing cycle at the plan level — but that count is visible only in the
Adalo builder's own dashboard, never through this API.

## Declared health checks

Per [`rfcs/healthcheck.md`](https://github.com/w6w-io/w6w-core/blob/main/rfcs/healthcheck.md).

| Key | Kind | Scope | Credential | Severity | Min interval | Probe |
|---|---|---|---|---|---|---|
| `service` | service | app | none | degraded | 60s | `health/service.ts` |
| `quota` | quota | connection | signed | informational | — | declared `unavailable` |
| `auth:api-key` | credential | connection | signed | fatal | — | derived from the `api-key` auth method's `test` hook |

## The gaps this API has

Findings from building this app against the live API (2026-09-05) that are easy to lose a
day to:

1. **There is no "list Collections" endpoint.** `GET /v0/apps/{appId}/collections` (no
   id) is a `404` — a genuinely unregistered route, not a hidden empty-list response
   (confirmed against a control probe: an unrelated made-up path segment 404s identically,
   while every real route shape answers with a structured auth-error JSON body instead).
   A Collection's id is only visible in the Adalo builder's own generated "API
   Documentation" panel. This app therefore has no `list-collections` action.
2. **The docs' one filtering example is internally inconsistent with the rest of the
   API.** `help.adalo.com/integrations/the-adalo-api/collections` shows
   `GET /collections/{id}/records?filterKey=...` — an extra `/records` path segment that
   appears nowhere else in the docs, and that create/update never use
   (`POST /collections/{id}`, `PUT /collections/{id}/{recordId}`). Live probing shows the
   route pattern is actually `/collections/{collectionId}/{recordId}` with a generic
   second segment — `records` there is simply being matched as an (nonexistent) record
   id, not a distinct listing endpoint — which also matches a real, shipped third-party
   integration (n8n's Adalo node). This app implements filtering as documented — query
   params on the plain `GET /collections/{collectionId}` — and does **not** add the
   `/records` segment.
3. **The Notifications API is a completely different shape and is out of scope here.**
   `POST https://api.adalo.com/notifications` has no `/v0/apps/{appId}` prefix at all —
   the App ID goes in the request **body** instead of the path — unlike every Collections
   endpoint. Building both into one client without noticing this would silently break one
   of them. This app only implements the Collections API.
4. **A `403` from Adalo isn't a bad credential.** The vendor's own Error Codes doc
   describes `[400] Request failed with Status 403` as caused by (a) not being on a plan
   with API access, (b) no remaining "App Actions" left this billing cycle, or (c)
   Collection Permissions not configured to allow API access — three plan/config problems,
   none of which mean the key itself is wrong. `test` reports this distinctly rather than
   as "reconnect your credential".
5. **No numeric/UUID assumption should be made about IDs.** The docs never state a format
   for App ID, Collection ID or Record ID beyond "the id in the URL" — all three are
   treated here as opaque strings.

---

Researched and endpoint-verified live 2026-09-05 (no real Adalo app/API key was
available, so `test`'s exact behavior against a genuine plan/permission `403` and the
create/update/delete success response bodies are inferred from the vendor's Error Codes
doc and a real third-party integration's field mapping, respectively — not observed
directly. Re-check against a live app if either ever needs to be pinned down further.
