import type { AuthDefinition } from "@w6w/types";
import {
  baseUrl,
  ERROR_MISSING_HEADER,
  ERROR_UNRECOGNIZED_TOKEN,
  type QualtricsEnvelope,
} from "../lib/client.ts";

/**
 * Qualtrics API token (`apiKey`) — a static token in the `X-API-TOKEN` header.
 *
 * Qualtrics publishes no OAuth surface for third-party integrations; the token
 * is the whole authentication story. It is created under Account Settings →
 * Qualtrics IDs, alongside the account's **datacenter id** — the regional pod
 * (`iad1`, `fra1`, `syd1`, …) whose host serves this account's API. That id is
 * collected here, not per-action, because it identifies the account: it is
 * recorded on the connection's redacted `display` by `afterConnect` and every
 * request URL is built from it.
 *
 * ## The probe is `GET /API/v3/whoami`
 *
 * Confirmed live against `iad1.qualtrics.com` on 2026-09-22: with no header it
 * answers `400 ATP_2`, with a garbage header `401 DCD_7`, and a nonexistent path
 * answers the different `404` body shape — so the route is real and the failures
 * are the API's own, not a catch-all.
 *
 * It is a safe probe because the response is the caller's **own profile**
 * (`userId`, `userName`, `firstName`, `lastName`, `email`, `brandId`, …) and
 * never the API token itself — unlike the `/me`- and `/apikey`-shaped probes
 * banned elsewhere in this pack, which echo the caller's live credential.
 *
 * ## Classification is by body, never by status
 *
 * Qualtrics answers **two different statuses for two different problems** — 400
 * for a credential that never arrived, 401 for one it does not recognize — so
 * both `errorCode` and `errorMessage` are read from `meta.error`. Flattening
 * them would tell a user to rotate a token that was simply never attached.
 */

export interface QualtricsCredential {
  datacenterId: string;
  apiToken: string;
}

/**
 * Normalise the datacenter id a user typed.
 *
 * Account Settings shows the id on its own (`iad1`), but the surrounding UI
 * often has the full host in a copy buffer, so a pasted
 * `https://iad1.qualtrics.com/API/v3` is accepted and reduced rather than
 * rejected.
 */
export function normalizeDatacenterId(raw: unknown): string {
  let value = String(raw ?? "").trim().toLowerCase();
  value = value.replace(/^https?:\/\//, "");
  value = value.replace(/\/.*$/, "");
  value = value.replace(/\.qualtrics\.com$/, "");
  return value;
}

/**
 * The one place the wire format is built. Exported so `test` and `afterConnect`
 * exercise the same code path `sign` does — a hand-rolled second copy is how a
 * probe ends up sending a header the real requests do not.
 */
export function authHeaders(credential: Partial<QualtricsCredential>): Record<string, string> {
  return { "x-api-token": credential.apiToken ?? "" };
}

/** The credential-liveness probe. Pinned here and asserted in the entry tests. */
export const PROBE_PATH = "/whoami";

function classifyFailure(status: number, body: QualtricsEnvelope | null): string {
  const code = body?.meta?.error?.errorCode;
  const message = body?.meta?.error?.errorMessage ?? "";

  if (code === ERROR_MISSING_HEADER || /Expected authorization in headers/i.test(message)) {
    return "Qualtrics received no API token. The credential did not reach the request — reconnect " +
      "this connection.";
  }
  if (
    code === ERROR_UNRECOGNIZED_TOKEN || status === 401 ||
    /Unrecognized X-API-TOKEN/i.test(message)
  ) {
    return `Qualtrics rejected the API token (${
      code ?? status
    }). Check it was copied exactly and has not been revoked — Account Settings → Qualtrics IDs.`;
  }
  return `Qualtrics returned HTTP ${status}${code ? ` (${code})` : ""}${
    message ? `: ${message}` : ""
  } for ${PROBE_PATH}`;
}

const apiToken: AuthDefinition = {
  key: "api-token",
  type: "apiKey",
  displayName: "API Token",
  description:
    "Paste the API token and the datacenter id shown together under Account Settings → Qualtrics " +
    "IDs.",
  connectionLabel: "Qualtrics ({{datacenterId}})",
  apiKey: { in: "header", name: "X-API-TOKEN" },
  fields: [
    {
      key: "datacenterId",
      label: "Datacenter ID",
      type: "string",
      required: true,
      placeholder: "iad1",
      hint:
        "Account Settings → Qualtrics IDs → Datacenter ID, e.g. `iad1`, `fra1`, `syd1`. It selects " +
        "the regional host this account's API lives on; a pasted full URL is reduced to the id.",
    },
    {
      key: "apiToken",
      label: "API Token",
      type: "secret",
      required: true,
      hint: "Account Settings → Qualtrics IDs → API token. Use one dedicated to this connection.",
    },
  ],

  /**
   * The only hook handed the raw credential, and it runs network-less: it stamps
   * the `X-API-TOKEN` header and returns. The token never appears in a URL.
   */
  sign({ request, credential }) {
    const cred = credential as Partial<QualtricsCredential>;
    for (const [name, value] of Object.entries(authHeaders(cred))) {
      request.headers[name] = value;
    }
    return request;
  },

  async test({ credential }, ctx) {
    const cred = credential as Partial<QualtricsCredential>;
    const datacenterId = normalizeDatacenterId(cred?.datacenterId);
    const token = (cred?.apiToken ?? "").trim();
    if (!datacenterId) return { ok: false, message: "credential missing datacenterId" };
    if (!token) return { ok: false, message: "credential missing apiToken" };

    let res: Response;
    try {
      res = await ctx.fetch(`${baseUrl(datacenterId)}${PROBE_PATH}`, {
        headers: { accept: "application/json", ...authHeaders({ apiToken: token }) },
      });
    } catch {
      return {
        ok: false,
        message:
          `Could not reach ${datacenterId}.qualtrics.com. Check the datacenter id is the one ` +
          "shown under Account Settings → Qualtrics IDs.",
      };
    }
    if (res.ok) return { ok: true };

    // The status alone cannot classify this vendor — see the header comment.
    const body = await res.json().catch(() => null) as QualtricsEnvelope | null;
    return { ok: false, message: classifyFailure(res.status, body) };
  },

  /**
   * Record the datacenter id — and nothing secret — on the connection.
   *
   * `datacenterId` is what action code needs to build every request URL. The
   * display name is worth having so a list of Connections does not read
   * "Qualtrics" three times; it is read from the same `whoami` response, which
   * carries the caller's own profile and not the token.
   *
   * A failure here is deliberately silent: `test` has already established the
   * credential, and a missing display label must not fail a good Connection.
   */
  async afterConnect({ credential }, ctx) {
    const cred = credential as Partial<QualtricsCredential>;
    const datacenterId = normalizeDatacenterId(cred?.datacenterId);
    const token = (cred?.apiToken ?? "").trim();
    if (!datacenterId) return {};
    try {
      const res = await ctx.fetch(`${baseUrl(datacenterId)}${PROBE_PATH}`, {
        headers: { accept: "application/json", ...authHeaders({ apiToken: token }) },
      });
      if (!res.ok) return { datacenterId };
      const body = await res.json() as QualtricsEnvelope<
        { userName?: string; email?: string }
      >;
      const name = body?.result?.userName ?? body?.result?.email;
      return name ? { datacenterId, userName: name } : { datacenterId };
    } catch {
      return { datacenterId };
    }
  },
};

export default apiToken;
