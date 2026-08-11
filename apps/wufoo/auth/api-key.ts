import type { AuthDefinition } from "@w6w/types";
import {
  API_KEY_PATTERN,
  baseUrlFor,
  IGNORED_PASSWORD,
  normalizeSubdomain,
} from "../lib/client.ts";

/**
 * Wufoo API key — HTTP Basic, with the key as the **username**.
 *
 * ## The wire format, from the vendor
 *
 * Wufoo's own curl, verbatim from its API documentation (fetched 2026-08-11):
 *
 *     curl -u "AOI6-LFKL-VM1Q-IEX9":"footastic" \
 *          "https://fishbowl.wufoo.com/api/v3/forms.json"
 *
 * The API key goes in the username position and **the password is ignored** —
 * `footastic` is the documentation's placeholder, not a second secret. This app
 * sends the same constant so nobody is asked for a password that does nothing.
 *
 * A key is found in the Wufoo UI at **Form Manager → More → API Information**,
 * and is a 16-character code written as four hyphenated groups of four.
 *
 * ## Why the subdomain is a field here and not an action param
 *
 * A key belongs to one account and only authenticates against that account's
 * subdomain — `fishbowl.wufoo.com` for the vendor's demo. Putting the subdomain
 * on the Connection keeps the two halves of the credential together and keeps
 * every action host-agnostic; `tests/index.test.ts` asserts no action can take a
 * subdomain or host param.
 *
 * ## The probe is `forms.json`, and `users.json` is BANNED FROM THIS APP
 *
 * This is the sharpest thing in this integration, so it is stated plainly.
 * `GET /api/v3/users.json` returns, for **every user on the account**, a field
 * named `ApiKey` containing that user's own API key. From the vendor's own
 * documented response:
 *
 *     "Users": [
 *       { "User": "fishbowl", "Email": "fishbowl@wufoo.com", …,
 *         "ApiKey": "AOI6-LFKL-VM1Q-IEX9", … },
 *       { "User": "User With No Permissions", …,
 *         "ApiKey": "EL2P-RPCO-HD1W-SX96", … },
 *       …
 *     ]
 *
 * That is the Follow Up Boss `/me` and Mailjet `/apikey` failure mode, and worse
 * than either: it discloses *other people's* credentials, not just the caller's.
 * It is the obvious-looking whoami and it must never be the probe, must never be
 * an action, and must never be called for a display label.
 * `tests/index.test.ts` enforces that with a source-grep over the whole app, and
 * this app ships no user-listing action at all.
 *
 * `GET /api/v3/forms.json` is used instead: it is the narrowest thing any key
 * can be asked, it needs no extra permission, and its response is the account's
 * own form metadata with no credential material anywhere in it.
 */

export interface WufooCredential {
  subdomain: string;
  apiKey: string;
}

/**
 * The one place the wire format is built. Exported so `test` exercises the same
 * code path `sign` does — a hand-rolled second copy is how a probe ends up
 * sending a header the real requests do not.
 */
export function authHeaders(credential: Partial<WufooCredential>): Record<string, string> {
  const encoded = btoa(`${credential.apiKey ?? ""}:${IGNORED_PASSWORD}`);
  return { authorization: `Basic ${encoded}` };
}

/** The probe. Pinned here and asserted in `tests/index.test.ts`. */
export const PROBE_PATH = "/forms.json";

/** The endpoint this app refuses to call. See the module doc. */
export const BANNED_PATH = "users.json";

const apiKey: AuthDefinition = {
  key: "api-key",
  // `basic`, not `apiKey`: the credential is sent as HTTP Basic with the key in
  // the username position, which no `apiKey: { in, name }` placement describes.
  type: "basic",
  displayName: "API Key",
  description:
    "Find your key in Wufoo under Form Manager → More → API Information, and enter it with your " +
    "account subdomain. Wufoo ignores the Basic-auth password, so there is none to supply.",
  connectionLabel: "{{subdomain}}.wufoo.com",
  fields: [
    {
      key: "subdomain",
      label: "Account subdomain",
      type: "string",
      required: true,
      placeholder: "fishbowl",
      hint:
        "The account name in your Wufoo URL — the `fishbowl` in `fishbowl.wufoo.com`. A full URL " +
        "is accepted and reduced to the subdomain for you.",
    },
    {
      key: "apiKey",
      label: "API Key",
      type: "secret",
      required: true,
      placeholder: "AOI6-LFKL-VM1Q-IEX9",
      hint: "16 characters, in four hyphenated groups. Form Manager → More → API Information.",
    },
  ],

  /**
   * The only hook handed the raw credential, and it runs network-less: it stamps
   * the Basic header onto the outbound request and returns it.
   */
  sign({ request, credential }) {
    const cred = credential as Partial<WufooCredential>;
    for (const [name, value] of Object.entries(authHeaders(cred))) {
      request.headers[name] = value;
    }
    return request;
  },

  /**
   * Probes `forms.json` — never `users.json`. See the module doc for why that
   * distinction is the most important line in this file.
   *
   * The subdomain is validated before anything is sent: a malformed one would
   * otherwise produce a request to a *different account's* host, or to a
   * hostname that is not Wufoo at all.
   */
  async test({ credential }, ctx) {
    const cred = credential as Partial<WufooCredential>;
    if (!cred?.subdomain) return { ok: false, message: "credential missing subdomain" };
    if (!cred?.apiKey) return { ok: false, message: "credential missing apiKey" };
    if (!API_KEY_PATTERN.test(cred.apiKey)) {
      return {
        ok: false,
        message: "This does not look like a Wufoo API key. It should be 16 characters in four " +
          "hyphenated groups, e.g. `AOI6-LFKL-VM1Q-IEX9`, from Form Manager → More → API " +
          "Information.",
      };
    }

    let base: string;
    try {
      base = baseUrlFor(cred.subdomain);
    } catch (err) {
      return { ok: false, message: (err as Error).message };
    }

    const res = await ctx.fetch(`${base}${PROBE_PATH}`, {
      headers: { accept: "application/json", ...authHeaders(cred) },
    });

    if (res.status === 401 || res.status === 403) {
      return {
        ok: false,
        message: `Wufoo rejected the key (${res.status}). Check that it belongs to the ` +
          `\`${normalizeSubdomain(cred.subdomain)}\` account — a key from another account fails ` +
          "here even though it is valid elsewhere.",
      };
    }
    if (res.status === 404) {
      return {
        ok: false,
        message:
          `No Wufoo account at \`${normalizeSubdomain(cred.subdomain)}.wufoo.com\`. Check the ` +
          "subdomain.",
      };
    }
    if (!res.ok) return { ok: false, message: `Wufoo returned HTTP ${res.status}` };

    // A 200 that is not a forms envelope means something else answered — Wufoo
    // serves an HTML sign-in page for some misrouted requests.
    const body = await res.json().catch(() => null) as { Forms?: unknown } | null;
    if (!body || !Array.isArray(body.Forms)) {
      return {
        ok: false,
        message: "Host answered but did not return a Wufoo form list — is the subdomain right?",
      };
    }
    return { ok: true };
  },

  /**
   * Records the account subdomain so the client can build URLs — and a UI can
   * label the Connection — without either seeing the key.
   *
   * Nothing is fetched here. The obvious enrichment would be the account's
   * user record, and that is exactly the response that carries every user's
   * `ApiKey`; this app does not call it for any reason, including a nicer label.
   * The subdomain *is* the account's name, so it is a perfectly good one.
   */
  afterConnect({ credential }) {
    const cred = credential as Partial<WufooCredential>;
    if (!cred?.subdomain) return {};
    try {
      const subdomain = normalizeSubdomain(cred.subdomain);
      return { subdomain, site: { host: `${subdomain}.wufoo.com` } };
    } catch {
      return {};
    }
  },
};

export default apiKey;
