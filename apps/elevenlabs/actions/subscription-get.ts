import type { ActionDefinition } from "@w6w/types";
import { ElevenLabsClient } from "../lib/client.ts";

/**
 * `GET /v1/user/subscription` — the plan, and what is left of it.
 *
 * Returns `ExtendedSubscriptionResponseModel`: `character_count` against
 * `character_limit`, when that counter next resets, the voice-slot and
 * voice-edit allowances, the current overage cost, and the invoice state.
 *
 * It is the endpoint to call before launching a batch of generations, because
 * the numbers that stop work are all here and nowhere else.
 *
 * ## Three uses, one endpoint
 *
 * This is also the connection's credential probe (`auth/api-key.ts`) and the
 * source for the `quota` health check. That is not duplication: it is the
 * endpoint that requires a credential, reports headroom, and returns **no**
 * credential material — where the obvious alternative `GET /v1/user` returns the
 * caller's own API key. So it is simultaneously the right liveness probe, the
 * right headroom reading, and a useful thing for a workflow to read directly.
 *
 * ## Two fields that are read wrong
 *
 * `can_extend_character_limit` plus `max_credit_limit_extension` decide what
 * happens at 100%: with usage-based billing entitled and uncapped
 * (`"unlimited"`) generation continues and is billed as overage; with
 * `max_credit_limit_extension` of `0` it stops. And `max_character_limit_extension`
 * is documented as deprecated in favour of `max_credit_limit_extension` — reading
 * the old one gives a number that no longer governs anything.
 */
const subscriptionGet: ActionDefinition<Record<string, never>> = {
  key: "subscription-get",
  type: "read",
  resource: "account",
  title: "Get Subscription",
  description: "Read the plan tier, character allowance, voice slots and overage state.",
  params: [],
  output: [
    { key: "tier", type: "string", label: "Plan tier" },
    { key: "status", type: "string", label: "Subscription status" },
    { key: "character_count", type: "number", label: "Characters used this period" },
    { key: "character_limit", type: "number", label: "Character allowance for the period" },
    {
      key: "next_character_count_reset_unix",
      type: "number",
      label: "When the counter resets, Unix seconds",
    },
    { key: "voice_slots_used", type: "number", label: "Voice slots used" },
    { key: "voice_limit", type: "number", label: "Voice slot allowance" },
    { key: "current_overage", type: "object", label: "Usage-based billing incurred so far" },
  ],

  execute(_input, ctx) {
    return new ElevenLabsClient(ctx).json("/v1/user/subscription");
  },
};

export default subscriptionGet;
