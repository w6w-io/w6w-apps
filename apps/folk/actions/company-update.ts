import type { ActionDefinition } from "@w6w/types";
import { buildCompanyBody, companyFieldParams, type CompanyFieldsInput } from "../lib/company.ts";
import { FolkClient, networkPath } from "../lib/client.ts";
import { groupIdParam } from "../lib/params.ts";

interface Input extends CompanyFieldsInput {
  groupId: string;
  companyId: string;
}

/**
 * `PUT /network/{networkId}/group/{groupId}/company/{companyId}` — same
 * "documented as PUT, schema has no required fields" situation as
 * `person-update`; treated as a partial update for the same reason.
 */
const companyUpdate: ActionDefinition<Input> = {
  key: "company-update",
  type: "perform",
  resource: "company",
  title: "Update Company",
  description: "Update a company in a group. Only the fields you set are sent.",
  idempotent: true,
  params: [
    groupIdParam,
    {
      key: "companyId",
      label: "Company ID",
      type: "string",
      required: true,
      hint: "From company-find or the company object returned by company-create.",
    },
    ...companyFieldParams,
  ],
  output: [{ key: "company", type: "object", label: "The updated company" }],

  async execute(input, ctx) {
    const company = await new FolkClient(ctx).request(
      networkPath(
        `/group/${encodeURIComponent(input.groupId)}/company/${
          encodeURIComponent(input.companyId)
        }`,
      ),
      { method: "PUT", body: buildCompanyBody(input) },
    );
    return { company };
  },
};

export default companyUpdate;
