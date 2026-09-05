import type { ActionDefinition } from "@w6w/types";
import { compact, TapfiliateClient } from "../lib/client.ts";
import { addressParam, companyParam } from "../lib/params.ts";

/** `POST /affiliate-prospects/` */
interface Input {
  firstname: string;
  lastname: string;
  email?: string;
  company?: unknown;
  address?: unknown;
  programId?: string;
  affiliateGroupId?: string;
}

const affiliateProspectCreate: ActionDefinition<Input> = {
  key: "affiliate-prospect-create",
  type: "perform",
  resource: "affiliate-prospect",
  title: "Create Affiliate Prospect",
  description: "Create an affiliate prospect, optionally against a specific program or group.",
  idempotent: false,
  params: [
    { key: "firstname", label: "First name", type: "string", required: true },
    { key: "lastname", label: "Last name", type: "string", required: true },
    { key: "email", label: "Email", type: "string" },
    companyParam,
    addressParam,
    {
      key: "programId",
      label: "Program",
      type: "string",
      hint: "Adds the prospect to this program. Defaults to the account's default program.",
    },
    { key: "affiliateGroupId", label: "Affiliate group", type: "string" },
  ],
  output: [
    { key: "id", type: "string", label: "New affiliate prospect id" },
    { key: "referral_link", type: "object", label: "The prospect's referral link" },
  ],

  async execute(input, ctx) {
    return await new TapfiliateClient(ctx).json("/affiliate-prospects/", {
      method: "POST",
      body: compact({
        firstname: input.firstname,
        lastname: input.lastname,
        email: input.email,
        company: input.company,
        address: input.address,
        program_id: input.programId,
        affiliate_group_id: input.affiliateGroupId,
      }),
    });
  },
};

export default affiliateProspectCreate;
