import type { ActionDefinition } from "@w6w/types";
import { compact, customField, FreshsalesClient } from "../lib/client.ts";
import { dealOutput } from "../lib/params.ts";

interface Input {
  dealId: number;
  name?: string;
  amount?: number;
  expectedClose?: string;
  dealStageId?: number;
  customField?: unknown;
}

const dealUpdate: ActionDefinition<Input> = {
  key: "deal-update",
  type: "perform",
  resource: "deal",
  title: "Update Deal",
  description: "Update a deal. Only fields you set are changed.",
  idempotent: true,
  params: [
    { key: "dealId", label: "Deal ID", type: "number", required: true },
    { key: "name", label: "Name", type: "string" },
    { key: "amount", label: "Amount", type: "number", row: "money" },
    { key: "expectedClose", label: "Expected close", type: "date", row: "money" },
    {
      key: "dealStageId",
      label: "Deal stage ID",
      type: "number",
      advanced: true,
      hint: "Look this up via `GET /api/selector/deal_stages` in the Freshsales portal.",
    },
    {
      key: "customField",
      label: "Custom field",
      type: "json",
      advanced: true,
      hint: '{ "cf_source_detail": "referral" }',
    },
  ],
  output: dealOutput,

  execute(input, ctx) {
    return new FreshsalesClient(ctx).resource("deal", `/deals/${input.dealId}`, {
      method: "PUT",
      body: {
        deal: compact({
          name: input.name,
          amount: input.amount,
          expected_close: input.expectedClose,
          deal_stage_id: input.dealStageId,
          custom_field: customField(input.customField),
        }),
      },
    });
  },
};

export default dealUpdate;
