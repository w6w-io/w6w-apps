import type { ActionDefinition } from "@w6w/types";
import { FreshsalesClient } from "../lib/client.ts";
import { dealOutput } from "../lib/params.ts";

interface Input {
  dealId: number;
  include?: string[];
}

const dealGet: ActionDefinition<Input> = {
  key: "deal-get",
  type: "read",
  resource: "deal",
  title: "Get Deal",
  description: "Fetch a single deal by ID.",
  params: [
    { key: "dealId", label: "Deal ID", type: "number", required: true },
    {
      key: "include",
      label: "Include",
      type: "multiselect",
      advanced: true,
      hint: "Embed additional details in the response.",
      options: [
        { value: "owner", label: "Owner" },
        { value: "sales_account", label: "Account" },
        { value: "contacts", label: "Contacts" },
        { value: "deal_stage", label: "Deal stage" },
        { value: "deal_type", label: "Deal type" },
        { value: "creater", label: "Creator" },
        { value: "updater", label: "Updater" },
        { value: "source", label: "Source" },
      ],
    },
  ],
  output: dealOutput,

  execute(input, ctx) {
    return new FreshsalesClient(ctx).resource("deal", `/deals/${input.dealId}`, {
      query: { include: input.include?.length ? input.include.join(",") : undefined },
    });
  },
};

export default dealGet;
