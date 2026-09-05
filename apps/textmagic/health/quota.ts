/**
 * How much account balance is left?
 *
 * TextMagic bills sending against a **pre-paid balance** (`GET /user`'s
 * `balance` field, in the account's own currency) rather than a request-rate
 * ceiling — running out does not slow sending down, it stops it, since every
 * `message-send` deducts against it directly. There is no separate "credit
 * limit" to compute a fraction against, so this reports the raw balance and
 * only distinguishes "exhausted" (`down`) from "has some" (`ok`) — a made-up
 * low-water threshold would be a guess about spending habits this API gives no
 * way to inform.
 *
 * Reads the same `GET /user` call `actions/account-get.ts` exposes, rather
 * than a dedicated endpoint — TextMagic has none, and it costs one extra call
 * regardless since it is not the Auth `test` probe (see `auth/basic.ts` for
 * why `test` uses `/ping` instead).
 */
import type { HealthCheckDefinition } from "@w6w/types";
import { API_BASE } from "../lib/client.ts";

const quota: HealthCheckDefinition = {
  key: "quota",
  title: "Account balance",
  description:
    "The account's pre-paid balance, read from GET /user. Sending stops at zero rather than " +
    "slowing down, so this reports exhausted vs. not rather than a computed fraction.",
  kind: "quota",
  scope: "connection",
  credential: "signed",
  covers: ["*"],
  minIntervalSeconds: 300,

  async check(_input, ctx) {
    const res = await ctx.fetch(`${API_BASE}/user`, { headers: { accept: "application/json" } });
    if (!res.ok) {
      await res.body?.cancel();
      return { state: "unknown", message: `TextMagic returned ${res.status} for GET /user` };
    }

    const body = await res.json().catch(() => null) as
      | { balance?: number; currency?: { id?: string } }
      | null;
    if (!body || typeof body.balance !== "number") {
      return { state: "unknown", message: "GET /user carried no numeric balance" };
    }

    const unit = body.currency?.id ?? "account currency";
    const summary = `${body.balance.toFixed(2)} ${unit}`;

    if (body.balance <= 0) {
      return {
        state: "down",
        message: `no balance left (${summary}) — sending will be refused, not slowed`,
        quota: [{ id: "balance", remaining: body.balance, unit }],
      };
    }

    return {
      state: "ok",
      message: summary,
      quota: [{ id: "balance", remaining: body.balance, unit }],
      ttlSeconds: 300,
    };
  },
};

export default quota;
