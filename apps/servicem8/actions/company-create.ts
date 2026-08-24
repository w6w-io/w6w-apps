import type { ActionDefinition } from "@w6w/types";
import { compact, ServiceM8Client } from "../lib/client.ts";

/**
 * `POST /company.json` — create a Client. `name` is the only field
 * `CompanyCreate` marks `required`. Returns only the new uuid — see the note
 * in `lib/client.ts` on why create never echoes the record back.
 */
interface Input {
  name: string;
  address?: string;
  billingAddress?: string;
  website?: string;
  isIndividual?: boolean;
}

const companyCreate: ActionDefinition<Input, { uuid?: string }> = {
  key: "company-create",
  type: "perform",
  resource: "company",
  title: "Create Client",
  description: "Create a Client (Company). Returns only the new UUID.",
  idempotent: false,
  params: [
    { key: "name", label: "Company name", type: "string", required: true },
    { key: "address", label: "Address", type: "string" },
    { key: "billingAddress", label: "Billing address", type: "string" },
    { key: "website", label: "Website", type: "string" },
    {
      key: "isIndividual",
      label: "Is an individual (not a business)",
      type: "boolean",
    },
  ],
  output: [{ key: "uuid", type: "string", label: "New Client UUID (x-record-uuid)" }],

  async execute(input, ctx) {
    const { uuid } = await new ServiceM8Client(ctx).create(
      "/company.json",
      compact({
        name: input.name,
        address: input.address,
        billing_address: input.billingAddress,
        website: input.website,
        is_individual: input.isIndividual === undefined ? undefined : (input.isIndividual ? 1 : 0),
      }),
    );
    return { uuid };
  },
};

export default companyCreate;
