import type { ActionDefinition } from "@w6w/types";
import { KlaviyoClient, type KlaviyoEnvelope } from "../lib/client.ts";

interface Input {
  templateId: string;
  fieldsTemplate?: string;
}

const getTemplate: ActionDefinition<Input, KlaviyoEnvelope> = {
  key: "get-template",
  type: "read",
  resource: "template",
  title: "Get Template",
  description: "Retrieve a single email template by ID.",
  params: [
    { key: "templateId", label: "Template ID", type: "string", required: true },
    { key: "fieldsTemplate", label: "Template fields", type: "string" },
  ],

  async execute(input, ctx) {
    const client = new KlaviyoClient(ctx);
    return client.request<KlaviyoEnvelope>(`/templates/${input.templateId}/`, {
      query: { "fields[template]": input.fieldsTemplate },
    });
  },
};

export default getTemplate;
