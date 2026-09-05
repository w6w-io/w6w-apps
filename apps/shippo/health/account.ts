/**
 * Is **this connection's** Shippo account working, and is it the environment
 * you think?
 *
 * The failure this exists for is not an outage. It is a **test token doing
 * production work** — a `shippo_test_...` token succeeds at every call,
 * returns plausible rates and produces labels that are not postage, and
 * nothing in a shipment's own response says which kind of token made it.
 *
 * Unlike EasyPost, Shippo does not need a network call to learn this: the
 * token's own prefix states the environment (verified 2026-09-05 in Shippo's
 * "Testing the Shippo API" guide). So this check reads that prefix and treats
 * `test` as **`degraded`** rather than `ok` — right for a connection that
 * exists to build against, and exactly the warning worth having on the
 * connection that ships real orders. It still probes `GET /carrier_accounts`
 * to prove the account actually answers; a bad token is left to the derived
 * `auth:api-key` check rather than reported twice.
 */
import type { HealthCheckDefinition } from "@w6w/types";
import { BASE_URL, describeError } from "../lib/client.ts";

const account: HealthCheckDefinition = {
  key: "account",
  title: "Account and environment",
  description:
    "Whether this connection's account answers, and whether its token is test or live — a test " +
    "token succeeds at everything and buys nothing, which no credential check alone can see.",
  kind: "dependency",
  covers: ["*"],
  scope: "connection",
  credential: "signed",
  minIntervalSeconds: 600,

  async check(_input, ctx) {
    let res: Response;
    try {
      res = await ctx.fetch(`${BASE_URL}/carrier_accounts?results=1`, {
        headers: { accept: "application/json" },
      });
    } catch (err) {
      return { state: "down", message: `could not reach Shippo: ${String(err)}` };
    }

    if (res.status === 401 || res.status === 403) {
      const text = await res.text().catch(() => "");
      // The derived auth check owns credential failures — this just avoids
      // reporting the same fact as a second, unrelated-sounding outage.
      void describeError(res.status, text);
      return { state: "unknown", message: "the API token was rejected" };
    }
    if (!res.ok) {
      await res.body?.cancel();
      return { state: "down", message: `Shippo answered ${res.status}` };
    }
    await res.body?.cancel();

    // `afterConnect` already read the token's own prefix at connect time and
    // stored it on the Connection's display metadata — nothing here needs to
    // re-derive it, and this hook never sees the raw credential to do so.
    const mode = (ctx.connection?.display as { mode?: string } | undefined)?.mode;

    if (mode === "test") {
      return {
        state: "degraded",
        message: "this account answers, but the connection uses a TEST token — every rate and " +
          "label it produces is a simulation, and nothing is ever purchased",
      };
    }
    if (mode !== "live") {
      return {
        state: "unknown",
        message: "this account answers, but the connection did not record whether its token is " +
          "test or live",
      };
    }
    return { state: "ok", message: "connected (live)", ttlSeconds: 600 };
  },
};

export default account;
