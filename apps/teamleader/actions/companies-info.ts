import type { ActionDefinition } from "@w6w/types";
import { call, compact } from "../lib/client.ts";
import { idParam } from "../lib/params.ts";

/**
 * `POST /companies.info` — verified against
 * `developer.focus.teamleader.eu/docs/api/companies-info` on 2026-09-01.
 */
interface Input {
  id: string;
  includes?: string;
}

const companiesInfo: ActionDefinition<Input> = {
  key: "companies-info",
  type: "read",
  resource: "company",
  title: "Get Company",
  description: "Get details for a single company.",
  params: [
    idParam("Company ID", "e8d31ae7-8258-4fcd-9b2d-78f41b0aa5d5"),
    {
      key: "includes",
      label: "Includes",
      type: "string",
      placeholder: "related_companies,related_contacts",
      hint: "Comma-separated. When used the response also includes related_companies and/or " +
        "related_contacts.",
    },
  ],
  output: [{ key: "company", type: "object", label: "Company" }],

  async execute(input, ctx) {
    const company = await call(
      ctx,
      "companies.info",
      compact({ id: input.id, includes: input.includes }),
    );
    return { company };
  },
};

export default companiesInfo;
