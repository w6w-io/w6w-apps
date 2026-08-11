import type { AuthDefinition } from "@w6w/types";
import { BASE_URL } from "../lib/client.ts";

/**
 * Pushover application token + user key.
 *
 * ## The credential is two values, and neither is a header
 *
 * Pushover has no `Authorization` header. Its documentation says so plainly:
 * "No complicated authentication mechanisms like OAuth are required." Instead
 * every call carries two ordinary form parameters:
 *
 *   - **`token`** — the *application's* API token, from registering an
 *     application at `pushover.net/apps/build`. 30 characters, `[A-Za-z0-9]`,
 *     case-sensitive. It identifies the sending app and owns the monthly message
 *     quota.
 *   - **`user`** — the *recipient's* user or group key, from the Pushover
 *     dashboard. Also 30 characters. A group key is indistinguishable from a
 *     user key at the API, deliberately: "from your application's perspective,
 *     you do not need to distinguish between them."
 *
 * Both are held here rather than in the actions, and `sign` injects them, so an
 * action never sees either. That is the same rule the rest of this pack follows;
 * only the mechanism differs, because the credential goes in the body.
 *
 * ## How `sign` injects a body parameter
 *
 * `SignableRequest` carries `body` alongside `url` and `headers`, so the hook
 * can rewrite it. It parses the form-encoded body an action built, sets `token`
 * and `user`, and re-encodes — and does the same to the **query string** for the
 * two GET endpoints, since those carry their parameters there instead.
 *
 * The user key is injected only where the endpoint takes one. `/1/sounds.json`
 * and `/1/apps/limits.json` are application-scoped and take `token` alone;
 * sending `user` to them is harmless but pointless, and being precise here keeps
 * the recipient's key off requests that have no business carrying it.
 *
 * ## Why the user key lives on the Connection
 *
 * It is arguably a per-message value — you could imagine sending to different
 * users from one connection. It is a credential field here for two reasons: the
 * vendor calls it private ("user keys should be considered private and not
 * disclosed to 3rd parties"), and a Connection that means "notify this person"
 * is the useful unit. An action that needs a *different* recipient can still
 * override it per call — see `actions/message-send.ts`'s `userOverride`, which
 * exists precisely so the common case stays credential-shaped without making the
 * uncommon one impossible.
 */

/** Pushover tokens and user keys are both 30 characters of `[A-Za-z0-9]`. */
export const KEY_PATTERN = /^[A-Za-z0-9]{30}$/;

export interface PushoverCredential {
  token: string;
  user: string;
}

/** The probe. Pinned here and asserted in `tests/index.test.ts`. */
export const PROBE_PATH = "/1/users/validate.json";

/**
 * Inject the credential into a form-encoded string.
 *
 * Exported so `sign` and the tests exercise one implementation. Existing keys
 * are overwritten, so an action that somehow supplied a `token` cannot win over
 * the Connection's.
 */
export function injectCredential(
  encoded: string,
  credential: Partial<PushoverCredential>,
  includeUser: boolean,
): string {
  const params = new URLSearchParams(encoded);
  params.set("token", credential.token ?? "");
  if (includeUser) {
    // An action may name a different recipient; the Connection's key is the
    // default, not an override of a deliberate choice.
    if (!params.get("user")) params.set("user", credential.user ?? "");
  } else {
    params.delete("user");
  }
  return params.toString();
}

/**
 * Which endpoints take a `user` parameter.
 *
 * `/1/sounds.json` and `/1/apps/limits.json` are application-scoped; the others
 * address a recipient.
 */
export function endpointTakesUser(url: string): boolean {
  return !/\/1\/(sounds|apps\/limits)\.json/.test(url);
}

const appToken: AuthDefinition = {
  key: "app-token",
  type: "custom",
  displayName: "Application Token + User Key",
  description:
    "Register an application at pushover.net/apps/build for the API token, and copy your user key " +
    "(or a delivery group's key) from the Pushover dashboard.",
  connectionLabel: "Pushover ({{user.devices}} device(s))",
  fields: [
    {
      key: "token",
      label: "Application API Token",
      type: "secret",
      required: true,
      placeholder: "azGDORePK8gMaC0QOYAMyEEuzJnyUi",
      hint:
        "30 characters, from pushover.net/apps/build. It identifies your application and owns the " +
        "monthly message quota, which is shared across every application on the account.",
    },
    {
      key: "user",
      label: "User or Group Key",
      type: "secret",
      required: true,
      placeholder: "uQiRzpo4DXghDmr9QzzfQu27cmVRsG",
      hint:
        "30 characters, from your Pushover dashboard. A delivery group's key works identically — " +
        "the API does not distinguish them. This is the default recipient; an action can name a " +
        "different one.",
    },
  ],

  /**
   * The only hook handed the raw credential, and it runs network-less.
   *
   * Unlike every other app in this pack it rewrites the request *body* rather
   * than a header, because that is where Pushover takes its credentials. A GET's
   * parameters live in the query string, so both are handled.
   */
  sign({ request, credential }) {
    const cred = credential as Partial<PushoverCredential>;
    const includeUser = endpointTakesUser(request.url);

    if ((request.method ?? "GET").toUpperCase() === "GET") {
      const [base, query = ""] = request.url.split("?");
      request.url = `${base}?${injectCredential(query, cred, includeUser)}`;
      return request;
    }

    request.body = injectCredential(request.body ?? "", cred, includeUser);
    request.headers["content-type"] = "application/x-www-form-urlencoded";
    return request;
  },

  /**
   * `POST /1/users/validate.json` is the probe, and it is the only endpoint that
   * checks *both* halves of this credential.
   *
   * The vendor describes it as exactly this: a way "to validate those keys to
   * ensure that a user has copied them properly, that the account is valid, and
   * that there is at least one active device on the account". A connection whose
   * user key is valid but has no active device would otherwise look healthy and
   * then silently deliver nothing.
   *
   * Its response returns a `devices` array of the user's active device *names* —
   * no token, no key material. The two application-scoped endpoints were
   * considered and rejected as probes: `/1/sounds.json` and
   * `/1/apps/limits.json` validate the application token only, so a wrong user
   * key would sail past either.
   *
   * Pushover answers a bad credential with a 4xx *and* `status: 0`, naming the
   * offending field — verified live: an invalid token gives
   * `{"token":"invalid","errors":["application token is invalid"],"status":0}`.
   * Those field names are surfaced rather than flattened, because "which of the
   * two did I paste wrong?" is the whole question at connect time.
   */
  async test({ credential }, ctx) {
    const cred = credential as Partial<PushoverCredential>;
    if (!cred?.token) return { ok: false, message: "credential missing token" };
    if (!cred?.user) return { ok: false, message: "credential missing user" };
    if (!KEY_PATTERN.test(cred.token)) {
      return {
        ok: false,
        message:
          "The application token should be 30 letters and digits, from pushover.net/apps/build. " +
          "It is case-sensitive.",
      };
    }
    if (!KEY_PATTERN.test(cred.user)) {
      return {
        ok: false,
        message:
          "The user key should be 30 letters and digits, from your Pushover dashboard. It is not " +
          "your email address.",
      };
    }

    const res = await ctx.fetch(`${BASE_URL}${PROBE_PATH}`, {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ token: cred.token, user: cred.user }).toString(),
    });

    const body = await res.json().catch(() => null) as
      | { status?: number; errors?: string[]; devices?: string[]; token?: string; user?: string }
      | null;

    if (!body) return { ok: false, message: `Pushover returned HTTP ${res.status} with no body` };

    if (body.status !== 1) {
      // Pushover marks the offending field by name — `{"token":"invalid"}` or
      // `{"user":"invalid"}` — which answers the only question worth asking here.
      const which = body.token === "invalid"
        ? "The application token was rejected"
        : body.user === "invalid"
        ? "The user or group key was rejected"
        : "Pushover rejected the credential";
      const detail = (body.errors ?? []).join("; ");
      return { ok: false, message: detail ? `${which}: ${detail}` : which };
    }

    if (Array.isArray(body.devices) && body.devices.length === 0) {
      return {
        ok: false,
        message: "The keys are valid but the account has no active device, so nothing would be " +
          "delivered. Install and sign in to a Pushover client first.",
      };
    }
    return { ok: true };
  },

  /**
   * Records how many devices the recipient has, so a Connection can be labelled
   * without either key being visible.
   *
   * Device *names* are deliberately not republished — they are the recipient's
   * own hardware ("iphone", "work-laptop"), a display block is shown wherever
   * the Connection is, and a count answers the useful question ("will this
   * reach anyone?") without listing them.
   */
  async afterConnect({ credential }, ctx) {
    const cred = credential as Partial<PushoverCredential>;
    if (!cred?.token || !cred?.user) return {};

    const res = await ctx.fetch(`${BASE_URL}${PROBE_PATH}`, {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ token: cred.token, user: cred.user }).toString(),
    });
    if (!res.ok) return {};
    const body = await res.json().catch(() => null) as { devices?: string[] } | null;
    return { user: { devices: Array.isArray(body?.devices) ? body.devices.length : undefined } };
  },
};

export default appToken;
