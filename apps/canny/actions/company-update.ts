import type { ActionDefinition } from "@w6w/types";
import { asOptionalJson, CannyClient } from "../lib/client.ts";
import { idOutput } from "../lib/output.ts";

/**
 * `POST /v1/companies/update` — update a company's fields.
 *
 * There is no dedicated `companies/create` endpoint: Canny's own docs say a
 * company is created implicitly the first time a user is upserted (Upsert
 * User) with that company id in its `companies` list. This action only
 * updates a company that already exists.
 */
interface Input {
  id: string;
  created?: string;
  customFields?: unknown;
  domain?: string;
  monthlySpend?: number;
  name?: string;
}

const companyUpdate: ActionDefinition<Input> = {
  key: "company-update",
  type: "perform",
  resource: "company",
  title: "Update Company",
  description:
    "Update a company. To create one, upsert a user with this company id in its companies list.",
  idempotent: true,
  params: [
    {
      key: "id",
      label: "Company",
      type: "string",
      required: true,
      hint: "The identifier you used when this company was created.",
    },
    {
      key: "name",
      label: "Name",
      type: "string",
      validation: { maxLength: 100 },
    },
    {
      key: "domain",
      label: "Domain",
      type: "string",
      hint: 'Bare domain, e.g. "acme.com" — no protocol or path. Used to match companies across ' +
        "data sources.",
    },
    {
      key: "monthlySpend",
      label: "Monthly spend",
      type: "number",
      hint: "MRR in dollars. Rounded to two decimal places.",
    },
    {
      key: "created",
      label: "Created at",
      type: "datetime",
      advanced: true,
      hint: "The date this company was created in your system.",
    },
    {
      key: "customFields",
      label: "Custom fields",
      type: "json",
      advanced: true,
      hint: "Field names must be 0-30 characters; string values under 200 characters.",
    },
  ],
  output: idOutput,

  execute(input, ctx) {
    return new CannyClient(ctx).post<{ id: string }>("/companies/update", {
      id: input.id,
      created: input.created,
      customFields: asOptionalJson(input.customFields, "customFields"),
      domain: input.domain,
      monthlySpend: input.monthlySpend,
      name: input.name,
    });
  },
};

export default companyUpdate;
