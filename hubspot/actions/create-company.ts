import type { ActionDefinition } from "@w6w/types";
import { crmCreate } from "../lib/crm.ts";

interface Input {
  name: string;
  domain?: string;
  industry?: string;
  phone?: string;
  city?: string;
  country?: string;
  description?: string;
  numberofemployees?: number;
  additionalProperties?: Record<string, unknown>;
}

const createCompany: ActionDefinition<Input> = {
  key: "create-company",
  type: "perform",
  resource: "company",
  title: "Create Company",
  description: "Create a new company.",
  params: [
    { key: "name", label: "Name", type: "string", required: true },
    { key: "domain", label: "Domain", type: "string" },
    { key: "industry", label: "Industry", type: "string" },
    { key: "phone", label: "Phone", type: "string" },
    { key: "city", label: "City", type: "string" },
    { key: "country", label: "Country", type: "string" },
    { key: "description", label: "Description", type: "text" },
    { key: "numberofemployees", label: "Number of employees", type: "number" },
    { key: "additionalProperties", label: "Additional properties", type: "json" },
  ],

  async execute(input, ctx) {
    return crmCreate(ctx, "companies", {
      properties: {
        name: input.name,
        domain: input.domain,
        industry: input.industry,
        phone: input.phone,
        city: input.city,
        country: input.country,
        description: input.description,
        numberofemployees: input.numberofemployees,
        ...(input.additionalProperties ?? {}),
      },
    });
  },
};

export default createCompany;
