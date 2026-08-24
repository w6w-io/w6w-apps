import type { ActionDefinition } from "@w6w/types";
import { WealthboxClient } from "../lib/client.ts";

interface Input {
  documentType?: string;
}

/**
 * `GET /v1/categories/custom_fields` — list every custom field defined on the
 * account (workspace), optionally filtered to one document type. Discovering
 * a custom field's numeric `id` here is a prerequisite for setting it through
 * the `custom_fields` request attribute on Create/Update Contact, Task, Event
 * or Opportunity (via `additionalProperties`).
 */
const listCustomFields: ActionDefinition<Input> = {
  key: "list-custom-fields",
  type: "read",
  resource: "custom-field",
  title: "List Custom Fields",
  description: "List every custom field defined on the account, optionally by document type.",
  params: [
    {
      key: "documentType",
      label: "Document type",
      type: "select",
      options: [
        { value: "Contact", label: "Contact" },
        { value: "Opportunity", label: "Opportunity" },
        { value: "Project", label: "Project" },
        { value: "Task", label: "Task" },
        { value: "Event", label: "Event" },
        { value: "ManualInvestmentAccount", label: "Manual Investment Account" },
        { value: "DataFile", label: "Data File" },
      ],
    },
  ],
  output: [{ key: "custom_fields", type: "array", label: "Custom fields" }],

  execute(input, ctx) {
    return new WealthboxClient(ctx).request("/categories/custom_fields", {
      query: { document_type: input.documentType },
    });
  },
};

export default listCustomFields;
