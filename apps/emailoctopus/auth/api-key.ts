import type { AuthDefinition } from "@w6w/types";
import { API_URL, type ProblemDetails } from "../lib/client.ts";

/**
 * API Key — the only credential the EmailOctopus v2 API accepts.
 *
 * `components.securitySchemes` in the v2 OpenAPI document contains exactly one
 * scheme, `api_key`, declared as `{ type: "http", scheme: "bearer", in:
 * "header", name: "Authorization" }`. There is no OAuth flow, no HMAC signing
 * and no per-request signature, so `sign` is a one-line bearer stamp.
 *
 * **Two key generations.** A key minted before v2 shipped is labelled *legacy*
 * in the dashboard and is rejected by v2; the vendor's own instruction is to
 * generate a new one, which works on both API versions. The v1 API took the key
 * as an `api_key` QUERY PARAMETER on a different host
 * (`emailoctopus.com/api/1.6/...`) — a query-string secret leaks into access
 * logs, proxy caches and `Referer` headers, so the header is a real improvement
 * and not just a version bump.
 */
const apiKey: AuthDefinition = {
  key: "api-key",
  type: "apiKey",
  displayName: "API Key",
  description:
    "Paste an API key from emailoctopus.com → Developer → API keys. Sent as `Authorization: Bearer <key>`. Keys created before API v2 are labelled 'legacy' and will not work — generate a new one.",
  apiKey: {
    in: "header",
    name: "Authorization",
    prefix: "Bearer ",
  },
  fields: [
    {
      key: "apiKey",
      label: "API Key",
      type: "secret",
      required: true,
      hint:
        "emailoctopus.com → Developer → API keys → create. A 'legacy' (pre-v2) key is rejected by this API.",
    },
  ],

  sign({ request, credential }) {
    const { apiKey: key } = credential as { apiKey: string };
    request.headers["authorization"] = `Bearer ${key}`;
    return request;
  },

  /**
   * Probe: `GET /lists?limit=1`.
   *
   * Why this endpoint, out of the 25 the v2 API publishes:
   *
   *   - **There is no whoami.** The v2 spec has no `/account`, `/me` or
   *     equivalent — `/lists` and `/campaigns` are the only two collections
   *     reachable without already knowing an id, and `/lists` is the one the
   *     vendor's own "check your key works" curl example uses.
   *   - **It requires the credential.** Measured unauthenticated against the
   *     live API on 2026-08-11: HTTP 401 with a JSON body. It is not one of
   *     those endpoints that answers 200 to anyone and lets a key that never
   *     attached look healthy.
   *   - **It echoes nothing secret.** The response is the account's lists;
   *     neither the key nor any other credential appears in it, so a failure
   *     message built from this body cannot leak one.
   *   - **It needs no scope.** EmailOctopus keys are not scoped, so there is no
   *     narrower-credential case this probe would misreport as broken.
   *
   * **The verdict is read from the BODY, never from the status code.** Measured
   * on 2026-08-11, two different failures both return HTTP 401 and are only
   * distinguishable by `detail`:
   *
   *     no Authorization header → "Full authentication is required to access
   *                                this resource."   type: "/errors/401"
   *     wrong / revoked key     → "Invalid key."     type: ".../v2#unauthorized"
   *
   * and a *legacy* key is documented as rejected too. So the hook reports the
   * server's own `detail` verbatim rather than translating a number. A 5xx or a
   * network failure is reported as such and not as "your key is bad" — the
   * credential has not been judged at all in that case.
   */
  async test({ credential }, ctx) {
    const { apiKey: key } = credential as { apiKey?: string };
    if (!key) return { ok: false, message: "credential missing apiKey" };

    let res: Response;
    try {
      res = await ctx.fetch(`${API_URL}/lists?limit=1`, {
        headers: { authorization: `Bearer ${key}`, accept: "application/json" },
      });
    } catch (e) {
      return { ok: false, message: `could not reach the EmailOctopus API: ${e}` };
    }

    const raw = await res.text().catch(() => "");
    let body: ProblemDetails | null = null;
    try {
      body = raw ? JSON.parse(raw) as ProblemDetails : null;
    } catch { /* non-JSON: per EmailOctopus's own docs, the request likely never reached them */ }

    if (res.ok) {
      // A 200 that is not the documented `{ data: [...] }` shape means something
      // answered on this host that is not the API — never treat that as a pass.
      const shaped = body !== null && Array.isArray((body as { data?: unknown }).data);
      return shaped ? { ok: true } : {
        ok: false,
        message:
          `unexpected ${res.status} body from GET /lists — not the documented { data: [...] }`,
      };
    }

    if (!body) {
      return {
        ok: false,
        message:
          `EmailOctopus returned ${res.status} with a non-JSON body; the request may not have reached the API`,
      };
    }

    if (res.status >= 500) {
      return {
        ok: false,
        message: `EmailOctopus is erroring (${res.status}): ${body.detail ?? ""}`,
      };
    }

    return {
      ok: false,
      message: body.detail ?? body.title ?? `EmailOctopus returned ${res.status}`,
    };
  },
};

export default apiKey;
