import type { AuthDefinition } from "@w6w/types";
import { API_BASE, API_PREFIX, encodeKey, truncate } from "../lib/client.ts";

/**
 * Knack's two-header credential — `X-Knack-Application-Id` + `X-Knack-REST-API-Key`.
 *
 * Confirmed against `docs.knack.com/reference/object-based-requests` (the
 * table naming both headers, `content-type` required only for PUT/POST) and
 * `docs.knack.com/reference/response-format` (the exact error strings below),
 * plus live probes against `api.knack.com` on 2026-09-05.
 *
 * ## Why a THIRD field (`testObject`) that no Action ever uses
 *
 * Every documented route in Knack's API — see `lib/client.ts` — is scoped to
 * an Object or a View. There is no whoami, no ping, no "list my objects": the
 * Application ID + API Key pair can only be proven live by actually reading
 * some real Object's records. Knack registers this in each customer's own
 * Knack app, so it cannot be guessed, defaulted, or discovered by this app —
 * it has to be collected once, at connect time, from the person connecting.
 * This field exists **only** to give `test` (and `health/quota.ts`, which
 * republishes it via `afterConnect`) something to probe; it plays no part in
 * `sign` and is never referenced by an Action, which each take their own
 * `objectKey` param instead (one Connection can reach every Object in the
 * app, not just this one).
 *
 * ## Knack's error bodies are exact English sentences, not JSON
 *
 * Measured live: `GET /v1/objects/object_1/records` with no headers at all
 * answers `401 Invalid API Request` (`content-type: text/html`) — plain text,
 * no envelope. A malformed Application ID answers `400 Malformed App ID.`
 * (sometimes prefixed `ValidationError: `). Knack's own response-format
 * reference names two more this way: `401 Invalid API key` (a well-formed
 * Application ID, wrong or revoked API key) and, for view-based requests only,
 * `403 Invalid or Expired Token`. `test` below matches on these substrings —
 * case-insensitively, since the exact prefix has already been seen to vary —
 * rather than trying to parse any of them as JSON.
 *
 * ## Application ID is not a secret; the API key is
 *
 * `docs.knack.com/reference/api-key-app-id` warns "Only use the API key for
 * Server Side APIs": Knack's own client-side JavaScript customizations run
 * with the Application ID exposed in the browser, so it is a `string` field
 * here, not a `secret` one. The API key is the entire authentication story and
 * is masked accordingly.
 */

export interface KnackCredential {
  applicationId: string;
  apiKey: string;
  testObject: string;
}

/**
 * The one place the wire format is built, so `sign` and `test` cannot drift
 * apart into sending two different requests.
 */
export function authHeaders(credential: Partial<KnackCredential>): Record<string, string> {
  return {
    "x-knack-application-id": credential.applicationId ?? "",
    "x-knack-rest-api-key": credential.apiKey ?? "",
  };
}

const applicationKey: AuthDefinition = {
  key: "application-key",
  type: "custom",
  displayName: "Application ID & API Key",
  description:
    "From your Knack Builder: Settings → API & Code → API. The Application ID identifies which " +
    "Knack app to reach; the API key authenticates the request and has full read/write access " +
    "to every Object and record in that app.",
  connectionLabel: "Knack (App {{applicationId}})",
  fields: [
    {
      key: "applicationId",
      label: "Application ID",
      type: "string",
      required: true,
      hint: "Builder → Settings → API & Code → API. Not secret on its own — Knack's client-side " +
        "code ships it openly — but it identifies which Knack app this Connection reaches.",
    },
    {
      key: "apiKey",
      label: "API Key",
      type: "secret",
      required: true,
      hint: "The same screen, below the Application ID. Server-side only — Knack's own docs warn " +
        "against using it in client-side code.",
    },
    {
      key: "testObject",
      label: "An Object key to verify with",
      type: "string",
      required: true,
      placeholder: "object_1",
      hint: "Knack's API has no endpoint that checks a credential without also reading a real " +
        "Object's records — there is no whoami. Give any Object key that exists in this app " +
        '(find one in the Builder, or enable "Show System Fields" on a table); it is used only ' +
        "to verify this Connection and is never touched by an Action, which each choose their " +
        "own Object.",
    },
  ],

  /**
   * The only hook handed the raw credential, and it runs network-less: it
   * stamps both headers and returns. Neither header is ever set by an Action.
   */
  sign({ request, credential }) {
    const cred = credential as Partial<KnackCredential>;
    for (const [name, value] of Object.entries(authHeaders(cred))) {
      request.headers[name] = value;
    }
    return request;
  },

  /**
   * `GET /v1/objects/{testObject}/records?rows_per_page=1` — the narrowest
   * request Knack's API can answer at all, and the only way to prove BOTH
   * headers without also proving a specific object exists (which is the
   * point of the field, not a side effect to work around).
   */
  async test({ credential }, ctx) {
    const cred = credential as Partial<KnackCredential>;
    const applicationId = (cred.applicationId ?? "").trim();
    const apiKey = (cred.apiKey ?? "").trim();
    const objectKey = (cred.testObject ?? "").trim();
    if (!applicationId) return { ok: false, message: "credential missing applicationId" };
    if (!apiKey) return { ok: false, message: "credential missing apiKey" };
    if (!objectKey) return { ok: false, message: "credential missing testObject" };

    const path = `${API_PREFIX}/objects/${encodeKey(objectKey)}/records`;
    const res = await ctx.fetch(`${API_BASE}${path}?rows_per_page=1`, {
      headers: { accept: "application/json", ...authHeaders({ applicationId, apiKey }) },
    });
    if (res.ok) return { ok: true };

    const text = await res.text().catch(() => "");

    if (res.status === 400 && /malformed app id/i.test(text)) {
      return {
        ok: false,
        message: "Knack rejected the Application ID as malformed. Copy it again from Builder → " +
          "Settings → API & Code → API.",
      };
    }
    if (res.status === 401 && /invalid api key/i.test(text)) {
      return {
        ok: false,
        message:
          "Knack rejected the API key. Copy it again from Builder → Settings → API & Code → " +
          "API — it changes whenever it is regenerated there.",
      };
    }
    if (res.status === 401 && /invalid api request/i.test(text)) {
      return {
        ok: false,
        message: "Knack received no Application ID — the credential did not reach the " +
          "request. Reconnect this Connection.",
      };
    }
    // Application ID and API key can both be well-formed and still fail here if
    // testObject names no real Object in this app — Knack documents no
    // distinct error string for that case, so it is reported as-is rather than
    // guessed at.
    return {
      ok: false,
      message: `Knack returned HTTP ${res.status} for GET /v1/objects/${objectKey}/records ` +
        `(${truncate(text, 300)}). If the Application ID and API key are correct, check that ` +
        `"${objectKey}" is a real Object key in this app.`,
    };
  },

  /**
   * Republish the Application ID and the test Object key onto the redacted
   * Connection — never the API key — so `health/quota.ts` can read them
   * without ever seeing the credential itself.
   */
  afterConnect({ credential }) {
    const cred = credential as Partial<KnackCredential>;
    const display: Record<string, unknown> = {};
    if (cred.applicationId) display.applicationId = cred.applicationId;
    if (cred.testObject) display.testObject = cred.testObject;
    return display;
  },
};

export default applicationKey;
