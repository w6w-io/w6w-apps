import type { ActionDefinition } from "@w6w/types";
import { WatiClient } from "../lib/client.ts";

interface AccountCreditsDto {
  credit?: number;
  welcome_credit?: number;
  remaining_free_conversations_count?: number;
  currency?: string;
  auto_charge_enabled?: boolean;
}

/**
 * `GET /api/ext/v3/account/credits` — verified against the embedded OpenAPI document 2026-09-05.
 * Returns the calling tenant's own paid/trial credit balance and free-conversation allowance.
 */
const action: ActionDefinition<Record<string, never>, AccountCreditsDto> = {
  key: "account-credits-get",
  type: "read",
  resource: "account",
  title: "Get Credit Balance",
  description:
    "Read this tenant's paid credit, welcome (trial) credit and free-conversation balance.",
  params: [],
  output: [
    { key: "credit", label: "Paid Credit", type: "number" },
    { key: "welcome_credit", label: "Welcome Credit", type: "number" },
    {
      key: "remaining_free_conversations_count",
      label: "Free Conversations Remaining",
      type: "number",
    },
    { key: "currency", label: "Currency", type: "string" },
    { key: "auto_charge_enabled", label: "Auto-Recharge Enabled", type: "boolean" },
  ],

  async execute(_input, ctx) {
    ctx.log("info", "getting Wati account credits");
    return await new WatiClient(ctx).get<AccountCreditsDto>("/account/credits");
  },
};

export default action;
