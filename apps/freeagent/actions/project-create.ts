import type { ActionDefinition } from "@w6w/types";
import { compact, FreeAgentClient, jsonObject, ref } from "../lib/client.ts";

interface Input {
  contactId: string;
  name: string;
  currency?: string;
  budget?: number;
  budgetUnits?: "Hours" | "Days" | "Monetary";
  additionalFields?: unknown;
}

const projectCreate: ActionDefinition<Input> = {
  key: "project-create",
  type: "perform",
  resource: "project",
  title: "Create Project",
  description: "Create a project for a contact.",
  // FreeAgent mints a new project id per call and offers no request key, so
  // a retry creates a duplicate project.
  idempotent: false,
  params: [
    { key: "contactId", label: "Contact ID", type: "string", required: true },
    { key: "name", label: "Name", type: "string", required: true },
    { key: "currency", label: "Currency", type: "string", hint: "E.g. GBP, USD, EUR." },
    {
      key: "budget",
      label: "Budget",
      type: "number",
      hint: "Leave unset (or 0) if this project has no budget.",
    },
    {
      key: "budgetUnits",
      label: "Budget units",
      type: "select",
      options: [
        { value: "Hours", label: "Hours" },
        { value: "Days", label: "Days" },
        { value: "Monetary", label: "Monetary (ex-VAT)" },
      ],
    },
    {
      key: "additionalFields",
      label: "Additional fields",
      type: "json",
      advanced: true,
      hint:
        'Merged into the project object using FreeAgent\'s field names, e.g. { "starts_on": "2026-09-01" }.',
    },
  ],
  output: [{ key: "project", type: "object", label: "Project" }],

  execute(input, ctx) {
    return new FreeAgentClient(ctx).request("/projects", {
      method: "POST",
      body: {
        project: {
          contact: ref("contacts", input.contactId),
          name: input.name,
          ...compact({
            currency: input.currency,
            budget: input.budget,
            budget_units: input.budgetUnits,
          }),
          ...jsonObject(input.additionalFields, "additionalFields"),
        },
      },
    });
  },
};

export default projectCreate;
