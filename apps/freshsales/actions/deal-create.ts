import type { ActionDefinition } from "@w6w/types";
import { compact, customField, FreshsalesClient } from "../lib/client.ts";
import { dealOutput } from "../lib/params.ts";

interface Input {
  name: string;
  amount?: number;
  salesAccountId?: number;
  expectedClose?: string;
  dealStageId?: number;
  customField?: unknown;
}

const dealCreate: ActionDefinition<Input> = {
  key: "deal-create",
  type: "perform",
  resource: "deal",
  title: "Create Deal",
  description: "Create a deal.",
  idempotent: false,
  params: [
    { key: "name", label: "Name", type: "string", required: true },
    { key: "amount", label: "Amount", type: "number", row: "money" },
    { key: "salesAccountId", label: "Account ID", type: "number", row: "money" },
    { key: "expectedClose", label: "Expected close", type: "date", advanced: true },
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
    return new FreshsalesClient(ctx).resource("deal", "/deals", {
      method: "POST",
      body: {
        deal: compact({
          name: input.name,
          amount: input.amount,
          sales_account_id: input.salesAccountId,
          expected_close: input.expectedClose,
          deal_stage_id: input.dealStageId,
          custom_field: customField(input.customField),
        }),
      },
    });
  },
};

export default dealCreate;
