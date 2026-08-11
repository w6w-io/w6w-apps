import type { ActionDefinition } from "@w6w/types";
import { CompanyCamClient } from "../lib/client.ts";

/**
 * `GET /v2/company` — the company this connection belongs to.
 *
 * Singular path, no id: there is exactly one company per credential. It returns
 * id, name, `status` (`active` / `cancelled` / `deleted`), address and logo
 * variants — and notably **no plan and no usage**, which is why
 * `health/quota.ts` declares quota unmeasurable rather than reading it here.
 */
type Input = Record<string, never>;

const companyGet: ActionDefinition<Input> = {
  key: "company-get",
  type: "read",
  resource: "company",
  title: "Retrieve Company",
  description: "Fetch the company this connection belongs to.",
  params: [],
  output: [
    { key: "id", type: "string", label: "Company ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "status", type: "string", label: "Status" },
    { key: "address", type: "object", label: "Address" },
    { key: "logo", type: "array", label: "Logo variants" },
  ],

  execute(_input, ctx) {
    return new CompanyCamClient(ctx).json("/company");
  },
};

export default companyGet;
