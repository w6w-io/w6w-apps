import type { AuthDefinition } from "@w6w/types";
import { API_BASE, classify } from "../lib/client.ts";

/**
 * ElevenLabs API key — the `xi-api-key` header.
 *
 * Verified on 2026-08-11 against the vendor's authentication reference
 * (`elevenlabs.io/docs/api-reference/authentication.md`), which states: "All API
 * requests should include your API key in an `xi-api-key` HTTP header", and
 * against the OpenAPI document, where **every** operation declares an
 * `xi-api-key` header parameter. There is no `components.securitySchemes` block
 * at all, which is why the header is read off the operations rather than a
 * security scheme.
 *
 * ## Not `Authorization: Bearer`
 *
 * The 401 body for a credential-less request reads "Neither authorization
 * header nor xi-api-key received", so a bearer header is *also* accepted. This
 * app sends only `xi-api-key`, because that is the form the vendor documents
 * and the only one its API-key documentation describes.
 *
 * ## Scoped keys
 *
 * An ElevenLabs key can be restricted three ways: by **scope** (which endpoint
 * families it may call, from the documented `PermissionType` vocabulary —
 * `user_read`, `voices_read`, `text_to_speech`, …), by **credit quota**, and by
 * **IP allowlist**. A scoped key is a supported and recommended configuration,
 * so this app must treat one as healthy rather than broken: that is what picks
 * the probe below, and why a `403 authorization_error` is reported as "scoped
 * away" rather than as a dead credential.
 *
 * Keys may also **expire** (user keys, 15 minutes to 30 days) or be
 * **auto-disabled** by ElevenLabs' GitHub secret-scanning partnership if they
 * are ever committed publicly. Both surface here as a rejected credential, and
 * both are worth naming in the failure message — "it worked yesterday" is the
 * usual report.
 */

export interface ElevenLabsCredential {
  apiKey: string;
}

/**
 * The one place the wire format is built. Exported so `test` and `afterConnect`
 * exercise the same code path `sign` does — a hand-rolled second copy is how a
 * probe ends up sending a header the real requests do not.
 */
export function authHeaders(credential: Partial<ElevenLabsCredential>): Record<string, string> {
  return { "xi-api-key": credential.apiKey ?? "" };
}

/**
 * The credential-liveness probe.
 *
 * `GET /v1/user/subscription` was chosen by reading the response *schema* and
 * by measuring the wire on 2026-08-11, not by its name:
 *
 * **(a) It requires a credential.** Unauthenticated it answers
 * `401 authentication_error / unauthorized`; with a syntactically plausible but
 * fake key it answers `400 authentication_error / invalid_api_key`. Both were
 * observed live. That rules out the tempting alternative `GET /v1/voices`,
 * which is **public** — measured, it answers `200` with 102,976 bytes of the
 * default voice catalogue and no credential at all, so a Connection whose key
 * never got attached would sail through a probe against it.
 *
 * **(b) It returns no credential material.** Its response is
 * `ExtendedSubscriptionResponseModel` — tier, character counts, voice slots,
 * invoices. No key, no token, nothing that could be replayed.
 *
 * **(c) It answers the quota question in the same call**, which is why
 * `health/quota.ts` reads the same endpoint.
 *
 * And it is specifically **not** `GET /v1/user`, the obvious whoami. See
 * {@link WHY_NOT_USER}.
 *
 * The honest caveat: every ElevenLabs endpoint is scope-gated, so there is no
 * scope-free ping to prefer. This probe needs whichever scope covers the user
 * endpoints (`user_read` in the documented `PermissionType` vocabulary). A key
 * scoped to text-to-speech alone will therefore be refused here — which is why
 * a `403` is reported as "live but scoped away", not as an invalid key.
 */
export const PROBE_PATH = "/v1/user/subscription";

/**
 * Why the whoami is not the probe — kept as an exported constant so the reason
 * survives the next person who notices `/v1/user` is shorter and returns more.
 *
 * `GET /v1/user` returns `UserResponseModel`, whose `xi_api_key` field is
 * documented as "The API key of the user" and whose schema example carries a
 * full key. A health probe's response is stored and displayed; using this
 * endpoint would copy a working credential into the health surface on every
 * check, forever. Follow Up Boss's `/me` and Mailjet's `/apikey` are the same
 * trap, and both are already banned pack-wide.
 *
 * The endpoint is still reachable as the `user-get` Action, which deletes that
 * one field before returning and keeps the vendor's own masked
 * `xi_api_key_preview`.
 */
export const WHY_NOT_USER = "GET /v1/user returns xi_api_key, the caller's own API key, in full";

const apiKey: AuthDefinition = {
  key: "api-key",
  type: "apiKey",
  displayName: "API Key",
  description:
    "Paste an API key from elevenlabs.io → Settings → API Keys. A scoped key is fine, and " +
    "recommended: give it only the permissions the workflows using this connection need.",
  connectionLabel: "ElevenLabs ({{tier}})",
  apiKey: {
    in: "header",
    name: "xi-api-key",
    prefix: "",
  },
  fields: [
    {
      key: "apiKey",
      label: "API Key",
      type: "secret",
      required: true,
      hint: "elevenlabs.io → Settings → API Keys. Use a key dedicated to this connection rather " +
        "than one shared with other services, and restrict its scope, credit quota and IP range " +
        "where you can.",
    },
  ],

  /**
   * The only hook handed the raw credential, and it runs network-less: it
   * stamps the `xi-api-key` header and returns. The key never appears in a URL —
   * ElevenLabs offers no query-parameter form, and a workflow host logs request
   * URLs while it does not log request headers.
   */
  sign({ request, credential }) {
    const cred = credential as Partial<ElevenLabsCredential>;
    for (const [name, value] of Object.entries(authHeaders(cred))) {
      request.headers[name] = value;
    }
    return request;
  },

  /**
   * See {@link PROBE_PATH} for why this endpoint and not the whoami.
   *
   * The verdict is read from the error **body**, never the status. ElevenLabs'
   * own error table documents `authentication_error` as HTTP 401, but a request
   * carrying a *wrong* key answers **400** — measured live on 2026-08-11
   * against this exact path. A `res.status === 401` test would report a mistyped
   * key as a generic bad request and send the user hunting for the wrong bug.
   */
  async test({ credential }, ctx) {
    const cred = credential as Partial<ElevenLabsCredential>;
    const key = (cred?.apiKey ?? "").trim();
    if (!key) return { ok: false, message: "credential missing apiKey" };

    const res = await ctx.fetch(`${API_BASE}${PROBE_PATH}`, {
      headers: { accept: "application/json", ...authHeaders({ apiKey: key }) },
    });
    if (res.ok) return { ok: true };

    const raw = await res.text().catch(() => "");
    const { detail, errorClass } = classify(res.status, raw);
    const code = detail?.code ? ` ${detail.code}` : "";

    if (errorClass === "authentication") {
      return {
        ok: false,
        message:
          `ElevenLabs rejected the key (HTTP ${res.status}${code}). Check it was copied exactly, ` +
          "and that it has not expired, been rotated, or been auto-disabled by ElevenLabs' " +
          "GitHub secret-scanning partnership after being committed publicly.",
      };
    }
    if (errorClass === "authorization") {
      return {
        ok: false,
        message:
          `ElevenLabs refused the account read (HTTP ${res.status}${code}). The key is live but ` +
          "is either scoped away from the user endpoints or restricted to an IP allowlist this " +
          "host is not on.",
      };
    }
    if (errorClass === "rate-limit") {
      return {
        ok: false,
        message: `ElevenLabs rate-limited the check (HTTP ${res.status}${code}); retry shortly.`,
      };
    }
    return {
      ok: false,
      message: `ElevenLabs returned HTTP ${res.status}${code} for ${PROBE_PATH}`,
    };
  },

  /**
   * Publish the plan tier, and nothing else.
   *
   * A list of Connections that all read "ElevenLabs" is unusable, and the tier
   * is the one field that distinguishes them without naming a person: it comes
   * from the same subscription read the probe already makes, so nothing extra
   * goes on the wire and `GET /v1/user` — the endpoint that would return the
   * key — is never called here at all.
   *
   * A failure is deliberately silent: `test` has already established the key is
   * live, and a missing display label must not fail a good Connection.
   */
  async afterConnect({ credential }, ctx) {
    const cred = credential as Partial<ElevenLabsCredential>;
    try {
      const res = await ctx.fetch(`${API_BASE}${PROBE_PATH}`, {
        headers: { accept: "application/json", ...authHeaders(cred) },
      });
      if (!res.ok) return {};
      const body = await res.json() as { tier?: string; status?: string } | null;
      const tier = body?.tier;
      if (!tier) return {};
      return body?.status ? { tier, status: body.status } : { tier };
    } catch {
      return {};
    }
  },
};

export default apiKey;
