/**
 * How much of this month's message-sending allowance is left?
 *
 * Combines two reads the actions surface (see `actions/message-quota-get.ts` and
 * `actions/message-quota-consumption-get.ts`):
 *
 *  - `GET /v2/bot/message/quota` — `{type: "none" | "limited", value?}`, the configured ceiling.
 *  - `GET /v2/bot/message/quota/consumption` — `{totalUsage}`, LINE's own word: "approximate".
 *
 * `type: "none"` means no ceiling is CONFIGURED (most free-tier and metered-paid accounts have no
 * fixed monthly cap — pricing is paid-per-message beyond a free allotment, not "the account stops
 * working at N"), not that there is no headroom, so it is reported as unmetered (`ok`) rather than
 * as exhausted — reading it the other way would report every unlimited account as broken.
 */
import type { HealthCheckDefinition } from "@w6w/types";

export const QUOTA_URL = "/v2/bot/message/quota";
export const CONSUMPTION_URL = "/v2/bot/message/quota/consumption";

/** Consumption at or above this fraction of a configured ceiling is worth flagging. */
export const WARN_FRACTION = 0.9;

interface QuotaBody {
  type?: string;
  value?: number;
}
interface ConsumptionBody {
  totalUsage?: number;
}

const quota: HealthCheckDefinition = {
  key: "quota",
  title: "Message quota headroom",
  description:
    "This month's configured message-sending limit (if any) against messages sent so far, from " +
    "GET /v2/bot/message/quota and GET /v2/bot/message/quota/consumption.",
  kind: "quota",
  scope: "connection",
  credential: "signed",
  covers: ["*"],
  minIntervalSeconds: 300,

  async check(_input, ctx) {
    const [quotaRes, consumptionRes] = await Promise.all([
      ctx.fetch(`https://api.line.me${QUOTA_URL}`, { headers: { accept: "application/json" } }),
      ctx.fetch(`https://api.line.me${CONSUMPTION_URL}`, {
        headers: { accept: "application/json" },
      }),
    ]);
    if (!quotaRes.ok) {
      return { state: "unknown", message: `LINE returned ${quotaRes.status} for ${QUOTA_URL}` };
    }
    if (!consumptionRes.ok) {
      return {
        state: "unknown",
        message: `LINE returned ${consumptionRes.status} for ${CONSUMPTION_URL}`,
      };
    }

    const quotaBody = await quotaRes.json().catch(() => null) as QuotaBody | null;
    const consumptionBody = await consumptionRes.json().catch(() => null) as
      | ConsumptionBody
      | null;
    if (!quotaBody || !consumptionBody) {
      return { state: "unknown", message: "quota/consumption response was unreadable" };
    }

    const used = consumptionBody.totalUsage;
    if (typeof used !== "number") {
      return { state: "unknown", message: "consumption response carried no totalUsage" };
    }

    // No configured ceiling — nothing to be low on. `used` is still worth reporting.
    if (quotaBody.type !== "limited" || typeof quotaBody.value !== "number") {
      return {
        state: "ok",
        message: `no monthly limit configured; ${used} messages sent this month (approximate)`,
        quota: [{ id: "monthly-messages", remaining: undefined, unit: "messages" }],
        ttlSeconds: 300,
      };
    }

    const limit = quotaBody.value;
    // A non-positive configured value reads the same as "unconfigured" — nothing to divide by.
    if (limit <= 0) {
      return {
        state: "ok",
        message: `no monthly limit configured; ${used} messages sent this month (approximate)`,
        ttlSeconds: 300,
      };
    }

    const remaining = Math.max(0, limit - used);
    const fraction = used / limit;
    const reading = { id: "monthly-messages", limit, remaining, unit: "messages" };

    if (fraction >= 1) {
      return {
        state: "down",
        message: `monthly message limit reached: ${used}/${limit} (approximate)`,
        quota: [reading],
        ttlSeconds: 300,
      };
    }
    if (fraction >= WARN_FRACTION) {
      return {
        state: "degraded",
        message: `monthly message limit nearly reached: ${used}/${limit} (${
          Math.round(fraction * 100)
        }%, approximate)`,
        quota: [reading],
        ttlSeconds: 300,
      };
    }
    return { state: "ok", quota: [reading], ttlSeconds: 300 };
  },
};

export default quota;
