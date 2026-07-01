import type { ActionDefinition } from "@w6w/types";
import { KlaviyoClient, type KlaviyoEnvelope } from "../lib/client.ts";

interface Input {
  templateId: string;
  context: Record<string, unknown>;
}

/**
 * Renders a template's HTML/text with the given variable context. Klaviyo
 * returns the rendered strings in the response — no email is sent. Handy for
 * previewing merged output or generating transactional bodies to send via
 * another channel.
 */
const renderTemplate: ActionDefinition<Input, KlaviyoEnvelope> = {
  key: "render-template",
  type: "perform",
  resource: "template",
  title: "Render Template",
  description: "Render a template with the given variable context. Returns the rendered HTML/text — does not send.",
  params: [
    { key: "templateId", label: "Template ID", type: "string", required: true },
    {
      key: "context",
      label: "Context",
      type: "json",
      required: true,
      hint: "Variables merged into the template, e.g. `{ \"first_name\": \"Alice\" }`.",
    },
  ],

  async execute(input, ctx) {
    const client = new KlaviyoClient(ctx);
    return client.request<KlaviyoEnvelope>(`/template-render/`, {
      method: "POST",
      body: {
        data: {
          type: "template",
          id: input.templateId,
          attributes: { context: input.context },
        },
      },
    });
  },
};

export default renderTemplate;
