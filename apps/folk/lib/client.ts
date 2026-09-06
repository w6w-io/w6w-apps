import type { HookContext } from "@w6w/types";

/**
 * folk External API — verified against the vendor's own OpenAPI 3.0.3
 * document on 2026-09-06. `folk-external-api.readme.io` (ReadMe) renders its
 * reference from an `oasDefinition` object embedded directly in every
 * reference page's server payload (e.g. fetching
 * `https://folk-external-api.readme.io/reference/listgroups` returns HTML
 * carrying the full spec as JSON) — this is the actual machine-readable
 * document the UI is generated from, not a transcription of the rendered
 * page. All 12 operations across all 4 tags (Network, Group Person, Group
 * Company, User) were read from that document.
 *
 * **Base URL is `https://api.folk.app`** (the OAS `servers[0].url`) — not the
 * `folk-external-api.readme.io` docs host.
 *
 * ## Auth: `X-Api-Key`, not `Authorization: Bearer`
 *
 * `components.securitySchemes.ApiKeyAuth` is `{"type":"apiKey","in":"header",
 * "name":"X-Api-Key"}`, applied globally (`security: [{"ApiKeyAuth": []}]`
 * at the document root, not overridden per-operation). The reference page's
 * own auth widget confirms the same thing independently (its input field's
 * DOM id is literally `APIAuth-X-Api-Key`). Folk's marketing copy elsewhere
 * loosely calls this a "bearer" key, which would suggest
 * `Authorization: Bearer <key>` — that is NOT what the wire format is.
 *
 * ## Every resource lives under a `networkId` you must already know
 *
 * All 11 operations besides `GET /user` are scoped under
 * `/network/{networkId}/...`. "Network" is folk's own name for what its UI
 * elsewhere calls a workspace. Nothing in this ReadMe project documents where
 * to find a network's id — the project has exactly the 12 reference pages
 * and no guide/getting-started pages — so this app treats it as a value the
 * user copies out of their own folk account and stores at connect time,
 * alongside the API key. `check-network-access` (`GET
 * /network/{networkId}/check-access`) exists for exactly this: it is the
 * auth `test` probe here because it is the one endpoint that validates BOTH
 * halves of the credential — the key and the network id — in a single call.
 *
 * ## No pagination anywhere
 *
 * `listGroups`, `listUsers`, `getPersonCustomFields` and
 * `getCompanyCustomFields` all return a bare JSON array with no page/cursor/
 * limit parameter declared anywhere in the OAS. Each call returns everything
 * in one response; there is no documented way to page a large result.
 *
 * ## `listUsers` returns folk's own team members, not CRM contacts
 *
 * `GET /network/{networkId}/users` — labelled "List Members" in the
 * reference sidebar — answers `ExternalUser[]` (`id`, `fullName`, `email`):
 * the humans who are logged into this folk network, i.e. teammates. It is
 * easy to reach for this expecting a network's CRM contacts; those are a
 * completely different, much richer shape (`ExternalGroupPerson`, with
 * emails/phones/urls/addresses/customFields) returned by the `person-*`
 * actions, which are scoped to a *group* (a folk contact list), not the
 * network as a whole. `list-network-members.ts` is named to keep the two
 * apart.
 *
 * ## No documented error-body schema (except `GET /user`'s 401)
 *
 * Every operation's OAS response documents only a status code
 * (400/401/403/404) with no `content` schema — the single exception is
 * `GET /user`'s `401`, whose schema is a bare string. No shared
 * `{message: ...}` envelope is guaranteed anywhere. `errorMessage` below is a
 * best-effort JSON reader (`message` or `error` keys) that falls back to the
 * raw response text, since nothing here can be assumed structured.
 */
export const API_URL = "https://api.folk.app";

/**
 * Plain-token placeholder for the `networkId` path segment, substituted by
 * `auth/api-key.ts`'s `sign` hook — the only hook holding the credential.
 * Deliberately NOT the OAS's own `{networkId}` curly-brace syntax: a
 * `sign` hook receives `request.url` as a plain string, and if anything
 * upstream ever normalises it through `new URL(...)` before `sign` runs,
 * `{`/`}` get percent-encoded to `%7B`/`%7D` (confirmed: `new
 * URL("https://x/{a}")` yields `.../%7Ba%7D`) and a literal
 * `.replace("{networkId}", ...)` would silently stop matching. An
 * alphanumeric-and-underscore token survives any such normalisation
 * untouched.
 */
export const NETWORK_PLACEHOLDER = "__network_id__";

export function networkPath(path: string): string {
  return `/network/${NETWORK_PLACEHOLDER}${path}`;
}

/** Best-effort reader for folk's undocumented (and inconsistent) error bodies. */
export function errorMessage(text: string): string {
  if (!text) return "";
  try {
    const body = JSON.parse(text) as { message?: string; error?: string };
    if (typeof body.message === "string") return body.message;
    if (typeof body.error === "string") return body.error;
  } catch {
    // Not JSON — fall through to the raw text.
  }
  return text;
}

/** Drop keys the caller left `undefined`, so an update never nulls out an untouched field. */
export function compact<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const out: Partial<T> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) (out as Record<string, unknown>)[k] = v;
  }
  return out;
}

export interface RequestOptions {
  method?: string;
  body?: Record<string, unknown>;
}

/**
 * Thin wrapper over `ctx.fetch`. Never sets `X-Api-Key` — the runtime routes
 * every request through the auth `sign` hook, the only code holding the
 * credential; `sign` is also what fills in `NETWORK_PLACEHOLDER` when a path
 * carries one.
 */
export class FolkClient {
  constructor(private ctx: HookContext) {}

  async request<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const headers: Record<string, string> = { accept: "application/json" };
    const init: RequestInit = { method: options.method ?? "GET", headers };
    if (options.body !== undefined) {
      headers["content-type"] = "application/json";
      init.body = JSON.stringify(options.body);
    }

    const res = await this.ctx.fetch(`${API_URL}${path}`, init);
    const text = await res.text();
    if (!res.ok) {
      const detail = errorMessage(text);
      throw new Error(
        `folk ${res.status} ${res.statusText} for ${init.method} ${path}` +
          (detail ? `: ${detail}` : ""),
      );
    }
    return text ? (JSON.parse(text) as T) : (undefined as T);
  }
}
