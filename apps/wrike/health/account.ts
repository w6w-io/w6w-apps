/**
 * Is the connected Wrike account itself still usable?
 *
 * `GET /account` returns `subscription.suspended` — a real, live boolean that,
 * when true, means every action this app performs will fail regardless of how
 * valid the token is. That is a different failure than "the token expired"
 * (covered by the derived `auth:permanent-token` check) and worth reporting
 * separately: an operator seeing "credential invalid" will try reconnecting,
 * which does nothing for a suspended account.
 *
 * Annotation:
 *  - `kind: "credential"` — this supplements rather than replaces the derived
 *    `auth:*` check (per `rfcs/healthcheck.md`'s "richer credential reporting"
 *    note): the token can be perfectly live and the account still unusable.
 *  - `scope: "connection"` — every Connection may point at a different Wrike
 *    account.
 *  - `credential: "signed"` — needs the stored token, exactly like an Action.
 *  - No `network.allow` — `/account` lives on the same host already on the
 *    app's allowlist.
 *
 * `subscription.userLimit` (the seat ceiling) is deliberately NOT read here —
 * see `health/quota.ts` for why it disqualifies itself as a probe.
 */
import type { HealthCheckDefinition } from "@w6w/types";
import { hostFromConnection, WrikeClient } from "../lib/client.ts";

interface AccountResponse {
  id?: string;
  name?: string;
  subscription?: { suspended?: boolean; paid?: boolean; type?: string; userLimit?: number };
}

const account: HealthCheckDefinition = {
  key: "account",
  title: "Account subscription usable",
  description:
    "GET /account's subscription.suspended flag. A suspended account fails every action " +
    "regardless of token validity, which is a different problem than an expired token.",
  kind: "credential",
  scope: "connection",
  credential: "signed",
  covers: ["*"],
  minIntervalSeconds: 300,

  async check(_input, ctx) {
    let host: string;
    try {
      host = hostFromConnection(ctx.connection);
    } catch {
      return { state: "unknown", message: "connection records no data-center host" };
    }

    const account = await new WrikeClient(ctx, host).one<AccountResponse>("/account");
    const suspended = account.subscription?.suspended;
    if (suspended === undefined) {
      return {
        state: "unknown",
        message: "account response carried no subscription.suspended field",
      };
    }
    if (suspended) {
      return {
        state: "down",
        message: `Wrike account${account.name ? ` "${account.name}"` : ""} is suspended`,
      };
    }
    return { state: "ok", ttlSeconds: 300 };
  },
};

export default account;
