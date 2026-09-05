import type { HealthCheckDefinition, HealthQuota, HealthState } from "@w6w/types";
import { WatiClient } from "../lib/client.ts";

/**
 * How much send-credit does this tenant have left?
 *
 * `GET /api/ext/v3/account/credits` (`AccountCreditsDto`) is a genuine documented balance, not a
 * header scraped off an unrelated response: `credit` (paid balance), `welcome_credit` (trial
 * balance) and `remaining_free_conversations_count` (free-tier conversations this cycle) are all
 * numeric fields Wati's own schema states explicitly. There is no published request-rate quota
 * to read instead — `errors.md`'s rate-limit table states fixed per-plan ceilings in prose
 * (`10/10sec`, `30-100/10sec` depending on plan and endpoint) with no response header or
 * counter endpoint of any kind, so that half is not checkable and is not claimed here.
 *
 * Same endpoint `auth/api-token.ts` uses for its `test` hook, deliberately: it is the narrowest
 * documented read (no required params, no pre-existing resource id needed) that both proves the
 * credential is live and answers the only quota question Wati's API can actually answer.
 *
 * `severity: "informational"` — a low or zero paid/trial balance does not mean every send fails
 * (`remaining_free_conversations_count` and `auto_charge_enabled` can both keep messages
 * flowing), so this is context for a UI, never a verdict-worsening signal.
 */
const quota: HealthCheckDefinition = {
  key: "quota",
  title: "Send-credit balance",
  description: "Paid credit, welcome (trial) credit, and free-conversation allowance, from " +
    "GET /api/ext/v3/account/credits.",
  kind: "quota",
  covers: ["*"],
  severity: "informational",
  minIntervalSeconds: 300,

  async check(_input, ctx) {
    interface AccountCreditsDto {
      credit?: number;
      welcome_credit?: number;
      remaining_free_conversations_count?: number;
      currency?: string;
      auto_charge_enabled?: boolean;
    }
    let body: AccountCreditsDto;
    try {
      body = await new WatiClient(ctx).get<AccountCreditsDto>("/account/credits");
    } catch (err) {
      return { state: "unknown", message: err instanceof Error ? err.message : String(err) };
    }

    const credit = typeof body.credit === "number" ? body.credit : undefined;
    const welcomeCredit = typeof body.welcome_credit === "number" ? body.welcome_credit : undefined;
    const freeConversations = typeof body.remaining_free_conversations_count === "number"
      ? body.remaining_free_conversations_count
      : undefined;
    if (credit === undefined && welcomeCredit === undefined && freeConversations === undefined) {
      return {
        state: "unknown",
        message: "account/credits response carried no known balance field",
      };
    }

    const unit = body.currency || "credits";
    const quotas: HealthQuota[] = [];
    if (credit !== undefined) quotas.push({ id: "credit", remaining: credit, unit });
    if (welcomeCredit !== undefined) {
      quotas.push({ id: "welcome_credit", remaining: welcomeCredit, unit });
    }
    if (freeConversations !== undefined) {
      quotas.push({
        id: "free_conversations",
        remaining: freeConversations,
        unit: "conversations",
      });
    }

    // Exhausted only when EVERY channel that could still fund a send is empty. Auto-recharge
    // means a low/zero paid balance never blocks sending, so it is excluded from "exhausted".
    const totalBalance = (credit ?? 0) + (welcomeCredit ?? 0);
    const exhausted = !body.auto_charge_enabled && totalBalance <= 0 &&
      (freeConversations ?? 0) <= 0;
    const state: HealthState = exhausted ? "down" : "ok";

    return {
      state,
      message: exhausted
        ? "no paid credit, welcome credit or free conversations remain, and auto-recharge is off"
        : undefined,
      quota: quotas,
      ttlSeconds: 300,
    };
  },
};

export default quota;
