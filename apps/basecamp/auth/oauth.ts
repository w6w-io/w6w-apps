import type { AuthDefinition } from "@w6w/types";
import { LAUNCHPAD_URL, USER_AGENT } from "../lib/client.ts";

/**
 * Basecamp OAuth 2.0, via 37signals Launchpad.
 *
 * ## OAuth is the only way in
 *
 * The vendor's words: "All Basecamp 5 API requests are authenticated by passing
 * along an OAuth 2 token." There are no personal access tokens and no API keys —
 * unlike most of this pack, there is no simpler credential to prefer.
 *
 * That is workable here because the **host** runs the authorization flow and
 * holds the refresh token; `sign` only stamps the resulting bearer. This is not
 * the pattern rejected in `apps/metabase` and `apps/mattermost`, where the
 * credential was a *session token fetched with a password* that `sign` would
 * have had to refresh from a network-less context.
 *
 * The endpoints, verbatim from the authentication guide:
 *
 *   - authorize — `https://launchpad.37signals.com/authorization/new`
 *   - token     — `https://launchpad.37signals.com/authorization/token`
 *
 * Register the application at `launchpad.37signals.com/integrations` for the
 * client id and secret.
 *
 * ## The account id is discovered, not configured
 *
 * Every API URL embeds an account id, and one person can belong to several
 * Basecamp accounts — so the token alone does not say which. `afterConnect`
 * reads `GET launchpad.37signals.com/authorization.json`, which returns the
 * identity plus the accounts the token can reach, and publishes the Basecamp 5
 * account's id on the Connection.
 *
 * When the token reaches more than one Basecamp 5 account the **first** is used
 * and the rest are recorded in `display.accounts` so the choice is visible
 * rather than silent. Picking a different one is a reconnect, not a hidden
 * setting; making it an action parameter would let two actions on one Connection
 * write to two different companies' Basecamps.
 *
 * ## Products that are not Basecamp 5
 *
 * `authorization.json` lists every 37signals product the identity can reach —
 * HEY, Basecamp 2, Basecamp Classic, Highrise. Only entries whose `product` is
 * `bc3` speak this API; the others have their own, incompatible ones. The filter
 * below is what stops a HEY-only identity from producing a Connection that 404s
 * on everything.
 */

export interface BasecampCredential {
  /** The bearer the host obtained through the OAuth flow. */
  accessToken?: string;
  access_token?: string;
}

/** `bc3` is Basecamp 5's product code in Launchpad's account list. */
export const BASECAMP_PRODUCT = "bc3";

export const AUTHORIZATION_URL = `${LAUNCHPAD_URL}/authorization/new`;
export const TOKEN_URL = `${LAUNCHPAD_URL}/authorization/token`;

/** The identity endpoint. Pinned here and asserted in `tests/index.test.ts`. */
export const PROBE_URL = `${LAUNCHPAD_URL}/authorization.json`;

interface LaunchpadAccount {
  id?: number;
  product?: string;
  name?: string;
  href?: string;
}

interface LaunchpadIdentity {
  identity?: { id?: number; email_address?: string; first_name?: string; last_name?: string };
  accounts?: LaunchpadAccount[];
}

/** Pull the token out of whichever field the host stored it under. */
export function bearerFrom(credential: Partial<BasecampCredential>): string {
  return credential.accessToken ?? credential.access_token ?? "";
}

/**
 * The Basecamp 5 accounts a token can reach, in Launchpad's own order.
 *
 * Exported so `afterConnect` and the tests share one implementation of the
 * `product === "bc3"` filter — the thing that keeps a HEY-only identity from
 * producing a broken Connection.
 */
export function basecampAccounts(identity: LaunchpadIdentity | null): LaunchpadAccount[] {
  return (identity?.accounts ?? []).filter((a) => a?.product === BASECAMP_PRODUCT && a.id);
}

const oauth: AuthDefinition = {
  key: "oauth",
  type: "oauth2",
  displayName: "Basecamp (OAuth)",
  description:
    "Authorize with your 37signals ID. Basecamp has no API keys — OAuth is the only way in. The " +
    "account is discovered from the authorization rather than typed in.",
  connectionLabel: "{{account.name}}",
  oauth2: {
    authorizationUrl: AUTHORIZATION_URL,
    tokenUrl: TOKEN_URL,
    // Launchpad issues a token for everything the identity can reach; there is
    // no scope vocabulary to narrow it with, which is why none is declared.
    scopes: [],
  },

  /**
   * The only hook handed the raw credential, and it runs network-less.
   *
   * It also stamps the `User-Agent` Basecamp requires — the vendor asks every
   * request to identify the application and a contact address, and a request
   * without one can be refused. The client sets it too; doing it here as well
   * means a request that somehow bypassed the client still carries it.
   */
  sign({ request, credential }) {
    const cred = credential as Partial<BasecampCredential>;
    request.headers["authorization"] = `Bearer ${bearerFrom(cred)}`;
    request.headers["user-agent"] = USER_AGENT;
    return request;
  },

  /**
   * `GET launchpad.37signals.com/authorization.json` is the probe.
   *
   * It is the endpoint the vendor themselves points at for this — "Try making
   * an authorized request to `https://launchpad.37signals.com/authorization.json`
   * to dig in and test it out!" — and it is the only one that can be called
   * *before* an account id is known, which the API URLs all require.
   *
   * Its body is an identity plus the accounts the token can reach. It carries
   * the user's name and email — their own, not a secret of this connection — and
   * **no token material**, which is what disqualifies the `/me`-shaped probes
   * elsewhere in this pack.
   *
   * A token that authenticates but reaches no **Basecamp 5** account is reported
   * as unusable, because every subsequent call would 404. That is the failure a
   * bare status check would miss: a 37signals ID with only HEY on it
   * authenticates perfectly.
   */
  async test({ credential }, ctx) {
    const cred = credential as Partial<BasecampCredential>;
    const token = bearerFrom(cred);
    if (!token) return { ok: false, message: "credential missing access token" };

    const res = await ctx.fetch(PROBE_URL, {
      headers: {
        accept: "application/json",
        authorization: `Bearer ${token}`,
        "user-agent": USER_AGENT,
      },
    });

    if (res.status === 401 || res.status === 403) {
      return {
        ok: false,
        message: `37signals rejected the token (${res.status}). Basecamp access tokens expire — ` +
          "reconnect to obtain a fresh one.",
      };
    }
    if (!res.ok) return { ok: false, message: `37signals returned HTTP ${res.status}` };

    const identity = await res.json().catch(() => null) as LaunchpadIdentity | null;
    if (!identity?.identity) {
      return { ok: false, message: "Launchpad answered but returned no identity." };
    }

    const accounts = basecampAccounts(identity);
    if (accounts.length === 0) {
      const others = (identity.accounts ?? []).map((a) => a.product).filter(Boolean);
      return {
        ok: false,
        message: others.length > 0
          ? `This 37signals ID has no Basecamp 5 account — it can reach ${
            [...new Set(others)].join(", ")
          }, which use different APIs.`
          : "This 37signals ID has no Basecamp 5 account.",
      };
    }
    return { ok: true };
  },

  /**
   * Records the account id every API URL needs, plus enough to label the
   * Connection.
   *
   * The account **name** is published because "which Basecamp is this?" is the
   * question someone looking at a list of Connections is asking, and it is the
   * organisation's own name rather than a person's. The identity's email is
   * deliberately not: a display block is shown wherever the Connection is, and
   * the account name answers the question without naming an individual.
   */
  async afterConnect({ credential }, ctx) {
    const cred = credential as Partial<BasecampCredential>;
    const token = bearerFrom(cred);
    if (!token) return {};

    const res = await ctx.fetch(PROBE_URL, {
      headers: {
        accept: "application/json",
        authorization: `Bearer ${token}`,
        "user-agent": USER_AGENT,
      },
    });
    if (!res.ok) return {};

    const identity = await res.json().catch(() => null) as LaunchpadIdentity | null;
    const accounts = basecampAccounts(identity);
    if (accounts.length === 0) return {};

    const [chosen, ...rest] = accounts;
    return {
      accountId: chosen.id,
      account: { id: chosen.id, name: chosen.name },
      // Surfaced rather than swallowed: if the token reaches several Basecamps,
      // the one in use should be visibly a choice.
      accounts: rest.length > 0
        ? [chosen, ...rest].map((a) => ({ id: a.id, name: a.name }))
        : undefined,
    };
  },
};

export default oauth;
