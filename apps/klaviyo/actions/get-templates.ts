import type { ActionDefinition } from "@w6w/types";
import { KlaviyoClient, type KlaviyoEnvelope } from "../lib/client.ts";

interface Input {
  filter?: string;
  sort?: string;
  pageCursor?: string;
  fieldsTemplate?: string;
}

const getTemplates: ActionDefinition<Input, KlaviyoEnvelope<unknown[]>> = {
  key: "get-templates",
  type: "read",
  resource: "template",
  title: "Get Templates",
  description: "List email templates.",
  params: [
    {
      key: "filter",
      label: "Filter",
      type: "string",
      hint: 'JSON:API filter, e.g. `equals(name,"Welcome")`.',
    },
    { key: "sort", label: "Sort", type: "string" },
    { key: "pageCursor", label: "Page cursor", type: "string" },
    { key: "fieldsTemplate", label: "Template fields", type: "string" },
  ],

  async execute(input, ctx) {
    const client = new KlaviyoClient(ctx);
    return client.request<KlaviyoEnvelope<unknown[]>>(`/templates/`, {
      query: {
        filter: input.filter,
        sort: input.sort,
        "page[cursor]": input.pageCursor,
        "fields[template]": input.fieldsTemplate,
      },
    });
  },
};

export default getTemplates;
