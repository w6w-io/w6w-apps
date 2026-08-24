import type { ActionDefinition } from "@w6w/types";
import { compact, encodeId, ServiceM8Client } from "../lib/client.ts";

/** `POST /company/{uuid}.json` — update a Client. Only set fields are sent. */
interface Input {
  companyUuid: string;
  name?: string;
  address?: string;
  billingAddress?: string;
  website?: string;
}

const companyUpdate: ActionDefinition<Input, { errorCode?: number; message?: string }> = {
  key: "company-update",
  type: "perform",
  resource: "company",
  title: "Update Client",
  description: "Update fields on an existing Client. Only the fields you set here are sent.",
  idempotent: true,
  params: [
    { key: "companyUuid", label: "Company UUID", type: "string", required: true },
    { key: "name", label: "Company name", type: "string" },
    { key: "address", label: "Address", type: "string" },
    { key: "billingAddress", label: "Billing address", type: "string" },
    { key: "website", label: "Website", type: "string" },
  ],
  output: [
    { key: "errorCode", type: "number", label: "0 on success" },
    { key: "message", type: "string", label: 'ServiceM8\'s own message, "OK" on success' },
  ],

  execute(input, ctx) {
    return new ServiceM8Client(ctx).update(
      `/company/${encodeId(input.companyUuid)}.json`,
      compact({
        name: input.name,
        address: input.address,
        billing_address: input.billingAddress,
        website: input.website,
      }),
    );
  },
};

export default companyUpdate;
