import type { ActionDefinition } from "@w6w/types";
import { encodeId, TapfiliateClient } from "../lib/client.ts";
import { affiliateIdParam } from "../lib/params.ts";

/** `GET /affiliates/{affiliate_id}/` */
interface Input {
  affiliateId: string;
}

const affiliateGet: ActionDefinition<Input> = {
  key: "affiliate-get",
  type: "read",
  resource: "affiliate",
  title: "Get Affiliate",
  description: "Fetch a single affiliate.",
  params: [affiliateIdParam],
  output: [
    { key: "id", type: "string", label: "Affiliate id" },
    { key: "firstname", type: "string", label: "First name" },
    { key: "lastname", type: "string", label: "Last name" },
    { key: "email", type: "string", label: "Email" },
    { key: "company", type: "object", label: "Company info" },
    { key: "address", type: "object", label: "Address" },
    { key: "parent_id", type: "string", label: "MLM parent affiliate id" },
    { key: "custom_fields", type: "object", label: "This account's custom field values" },
  ],

  async execute(input, ctx) {
    return await new TapfiliateClient(ctx).json(`/affiliates/${encodeId(input.affiliateId)}/`);
  },
};

export default affiliateGet;
