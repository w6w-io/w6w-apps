import type { ActionDefinition } from "@w6w/types";
import { buildCompanyBody, companyFieldParams, type CompanyFieldsInput } from "../lib/company.ts";
import { FolkClient, networkPath } from "../lib/client.ts";
import { groupIdParam } from "../lib/params.ts";

interface Input extends CompanyFieldsInput {
  groupId: string;
}

/** `POST /network/{networkId}/group/{groupId}/company` — `AddCompanyDto`. No idempotency key documented. */
const companyCreate: ActionDefinition<Input> = {
  key: "company-create",
  type: "perform",
  resource: "company",
  title: "Create Company",
  description: "Add a new company to a group.",
  idempotent: false,
  params: [groupIdParam, ...companyFieldParams],
  output: [{ key: "company", type: "object", label: "The created company" }],

  async execute(input, ctx) {
    const company = await new FolkClient(ctx).request(
      networkPath(`/group/${encodeURIComponent(input.groupId)}/company`),
      { method: "POST", body: buildCompanyBody(input) },
    );
    return { company };
  },
};

export default companyCreate;
