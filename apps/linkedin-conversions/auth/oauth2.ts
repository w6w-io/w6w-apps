import type { AuthDefinition } from "@w6w/types";
import { API_URL, API_VERSION, formatLinkedInConversionsError } from "../lib/client.ts";

/**
 * OAuth 2.0 for LinkedIn's **Conversions API** — the standard Authorization
 * Code flow, requesting the `rw_conversions` and `r_ads` scopes the
 * Conversions API docs' own Permissions section names as required together
 * for every call (`integrations/ads-reporting/conversions-api`, read
 * 2026-09-05): "Scope permissions to rw_conversions, r_ads" for a successful
 * call, and separately, for 3-legged OAuth specifically: "rw_conversions
 * (Read/Write). r_ads (Read)".
 *
 * This is a **different scope pair** from the sibling `linkedin-ads` app's
 * `rw_ads`/`r_ads_reporting` — do not assume they're interchangeable. Both
 * apps are approval-gated by LinkedIn independently; being approved for one
 * Marketing API surface does not imply approval for another.
 *
 * ## Beyond the OAuth scope, the ad account role also matters
 *
 * The docs' Permissions section adds a second, non-OAuth condition: "The
 * user assigning permission holds one of the following roles in the ad
 * account: ACCOUNT_BILLING_ADMIN, ACCOUNT_MANAGER, CAMPAIGN_MANAGER,
 * CREATIVE_MANAGER." A `VIEWER` role — even with `rw_conversions` granted —
 * cannot create or edit conversion rules. LinkedIn's own error table
 * (`conversions-api`) maps this failure to a **403 `USER_NOT_AUTHORIZED`**,
 * not a 401, which is why `test` below reads the response body specifically
 * to tell "connected, but not authorized" apart from "bad credential" — see
 * `test` below rather than reporting every non-2xx as "bad credential".
 *
 * ## Refresh tokens
 *
 * No custom `refresh` hook is declared: LinkedIn's Marketing API programs
 * generally issue a refresh token alongside the access token (access token
 * ~60 days), and when the stored credential carries a `refreshToken`, the
 * runtime's built-in handler renews it against `tokenUrl` with the standard
 * `grant_type=refresh_token` exchange.
 *
 * PKCE is off: LinkedIn's documented authorization/token requests for this
 * flow carry no `code_challenge`/`code_verifier`, mirroring both sibling
 * LinkedIn apps in this pack.
 */
const oauth2: AuthDefinition = {
  key: "oauth2",
  type: "oauth2",
  displayName: "OAuth (Conversions API)",
  description: "Create and manage Conversion Rules, associate campaigns, and stream conversion " +
    "events. Requires a LinkedIn Developer app approved for the Conversions API, and an ad " +
    "account role of Account Billing Admin, Account Manager, Campaign Manager or Creative " +
    "Manager — a correctly-configured app can still fail to connect until both are in place.",
  connectionLabel: "LinkedIn Conversions",
  oauth2: {
    authorizationUrl: "https://www.linkedin.com/oauth/v2/authorization",
    tokenUrl: "https://www.linkedin.com/oauth/v2/accessToken",
    scopes: ["rw_conversions", "r_ads"],
    scopeSeparator: " ",
    pkce: false,
  },

  sign({ request, credential }) {
    const { accessToken } = credential as { accessToken: string };
    request.headers["authorization"] = `Bearer ${accessToken}`;
    return request;
  },

  /**
   * `GET /rest/conversions?q=account&account=urn:li:sponsoredAccount:0` — the
   * only documented finder for Conversion Rules, which mandatorily requires
   * an account URN (there is no unfiltered "list everything" form). A
   * syntactically valid but non-existent account id (`0`) is used
   * deliberately, mirroring the sibling `linkedin-ads` app's
   * `oauth2-audiences.test`: a live token still gets back an empty
   * `elements` array rather than an error, without depending on the caller
   * having created a conversion rule yet or on this hook knowing which real
   * account to ask about. It needs only `r_ads`, and the response carries
   * nothing secret.
   */
  async test({ credential }, ctx) {
    const { accessToken } = credential as { accessToken?: string };
    if (!accessToken) return { ok: false, message: "credential missing accessToken" };

    const res = await ctx.fetch(
      `${API_URL}/rest/conversions?q=account&account=${
        encodeURIComponent("urn:li:sponsoredAccount:0")
      }`,
      {
        headers: {
          accept: "application/json",
          authorization: `Bearer ${accessToken}`,
          "x-restli-protocol-version": "2.0.0",
          "linkedin-version": API_VERSION,
        },
      },
    );
    if (res.ok) return { ok: true };

    const raw = await res.text().catch(() => "");
    if (res.status === 403) {
      return {
        ok: false,
        message: "LinkedIn returned 403 (USER_NOT_AUTHORIZED) for the Conversions API. This " +
          "usually means either the connected Developer app hasn't been approved for the " +
          "Conversions API, or the authorizing user lacks an Account Billing Admin / Account " +
          "Manager / Campaign Manager / Creative Manager role on the ad account — a valid access " +
          `token is not enough on its own. Detail: ${
            formatLinkedInConversionsError(res.status, "GET", "/rest/conversions", raw)
          }`,
      };
    }
    if (res.status === 401) {
      return {
        ok: false,
        message: `LinkedIn rejected the access token: ${
          formatLinkedInConversionsError(res.status, "GET", "/rest/conversions", raw)
        }`,
      };
    }
    return {
      ok: false,
      message: formatLinkedInConversionsError(res.status, "GET", "/rest/conversions", raw),
    };
  },
};

export default oauth2;
