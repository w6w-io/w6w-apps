import type { AuthDefinition } from "@w6w/types";
import { API_PREFIX, formatDustError, hostFor, regionOf } from "../lib/client.ts";

/**
 * Dust API Key (`custom` — bearer token plus two non-secret, connect-time
 * fields the credential's own paths need).
 *
 * Verified 2026-09-05 against the vendor's OpenAPI document
 * (`securitySchemes.BearerAuth`, `scheme: bearer`) and live probes against
 * `https://dust.tt/api/v1/w/{wId}/spaces` — see `lib/client.ts` for the full
 * verification note and the confirmed error taxonomy.
 *
 * ## Why `custom` and not `bearer`
 *
 * A pure `bearer` auth only ever stamps a header. Every Dust v1 path is
 * `/api/v1/w/{wId}/...` — the workspace the key belongs to — so this app also
 * needs the workspace id and its region on hand to build a URL at all. Both
 * are collected as ordinary (non-secret) fields alongside the key and echoed
 * onto the Connection's `display` by `afterConnect`, mirroring
 * `apps/kustomer/auth/api-key.ts`'s `orgSubdomain`.
 *
 * ## The `sk-` prefix is load-bearing
 *
 * Live probes on 2026-09-05 found Dust checks the bearer value's *shape*
 * before it ever looks the key up:
 *
 *   - no `Authorization` header → `401 not_authenticated`
 *   - a value not shaped like a Dust key (missing the `sk-` prefix) →
 *     `401 malformed_authorization_header_error`
 *   - an `sk-`-prefixed value Dust doesn't recognise → `401 invalid_api_key_error`
 *
 * `test` below reports all three with a distinct, actionable message instead
 * of collapsing them into one generic "unauthorized".
 *
 * ## Region is not guessable from the key
 *
 * A workspace lives in exactly one of two regions (`us-central1` /
 * `europe-west1`), each with its own host, and a key only works against its
 * own region's host — see `lib/client.ts` for the corroborating detail from
 * the vendor's own JS SDK. Getting this wrong looks identical to a bad key
 * (`invalid_api_key_error`), so `test` names the other region as the first
 * thing to try when the credential is otherwise correct.
 */

export interface DustCredential {
  apiKey: string;
  workspaceId: string;
  region?: string;
}

/** Probe used by both `test` and `afterConnect` so they exercise one code path. */
export const PROBE_PATH = "/spaces";

const apiKey: AuthDefinition = {
  key: "api-key",
  type: "custom",
  displayName: "API Key",
  description: "Create a key under Workspace Settings > Developer Tools > API Keys, and find the " +
    "workspace id and region in the same settings page (or in the app's own URL: " +
    "dust.tt/w/{workspaceId}/...).",
  connectionLabel: "Dust ({{workspaceId}})",
  fields: [
    {
      key: "apiKey",
      label: "API Key",
      type: "secret",
      required: true,
      hint: "Workspace Settings > Developer Tools > API Keys. Always starts with `sk-`.",
    },
    {
      key: "workspaceId",
      label: "Workspace ID",
      type: "string",
      required: true,
      placeholder: "dQFf9l5FQY",
      hint: "The short id in the workspace's own URL (dust.tt/w/{workspaceId}/...). Every " +
        "request is scoped to this workspace — a key only ever works for the workspace it " +
        "was minted in.",
      validation: { pattern: "^[A-Za-z0-9_-]+$" },
    },
    {
      key: "region",
      label: "Region",
      type: "select",
      required: true,
      default: "us",
      options: [
        { value: "us", label: "US — dust.tt (us-central1)" },
        { value: "eu", label: "EU — eu.dust.tt (europe-west1)" },
      ],
      hint: "Every workspace lives in exactly one region, each with its own host. The wrong " +
        "region looks exactly like a bad key.",
    },
  ],

  /** The only hook handed the raw credential. Network-less: stamps the header and returns. */
  sign({ request, credential }) {
    const { apiKey } = credential as Partial<DustCredential>;
    request.headers["authorization"] = `Bearer ${apiKey ?? ""}`;
    return request;
  },

  /** See the module doc for why three distinct 401 shapes are worth telling apart. */
  async test({ credential }, ctx) {
    const cred = credential as Partial<DustCredential>;
    const apiKey = (cred.apiKey ?? "").trim();
    const workspaceId = (cred.workspaceId ?? "").trim();
    if (!apiKey) return { ok: false, message: "credential missing apiKey" };
    if (!workspaceId) return { ok: false, message: "credential missing workspaceId" };

    const host = hostFor(cred.region);
    const res = await ctx.fetch(
      `${host}${API_PREFIX}/w/${encodeURIComponent(workspaceId)}${PROBE_PATH}`,
      { headers: { accept: "application/json", authorization: `Bearer ${apiKey}` } },
    );
    if (res.ok) return { ok: true };

    const body = await res.json().catch(() => null) as
      | { error?: { type?: string; message?: string } }
      | null;
    const type = body?.error?.type;
    const other = regionOf(cred.region) === "eu" ? "US" : "EU";

    if (type === "malformed_authorization_header_error") {
      return {
        ok: false,
        message: "Dust rejected the key's shape (it should start with `sk-`) — reconnect with " +
          "the key copied exactly from Workspace Settings > Developer Tools > API Keys.",
      };
    }
    if (type === "invalid_api_key_error" || res.status === 401) {
      return {
        ok: false,
        message:
          `Dust rejected the key against ${host} (${res.status}${
            type ? ` ${type}` : ""
          }). If it is definitely correct, try the ${other} region — a workspace in the other ` +
          "data centre fails with this same message.",
      };
    }
    if (res.status === 404) {
      return {
        ok: false,
        message: `no workspace ${workspaceId} at ${host} — check the workspace id, or try the ` +
          `${other} region.`,
      };
    }
    return { ok: false, message: `Dust returned ${await formatDustError(res)}` };
  },

  /** Echo workspace id + region onto the connection — this is where `lib/client.ts` reads them. */
  async afterConnect({ credential }, ctx) {
    const cred = credential as Partial<DustCredential>;
    const workspaceId = (cred.workspaceId ?? "").trim();
    const region = regionOf(cred.region);
    if (!workspaceId) return {};

    try {
      const host = hostFor(region);
      const res = await ctx.fetch(
        `${host}${API_PREFIX}/w/${encodeURIComponent(workspaceId)}${PROBE_PATH}`,
        { headers: { accept: "application/json", authorization: `Bearer ${cred.apiKey ?? ""}` } },
      );
      if (!res.ok) return { workspaceId, region };
      const body = await res.json().catch(() => null) as { spaces?: unknown[] } | null;
      return { workspaceId, region, spaceCount: body?.spaces?.length };
    } catch {
      return { workspaceId, region };
    }
  },
};

export default apiKey;
