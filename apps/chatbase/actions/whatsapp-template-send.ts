import type { ActionDefinition } from "@w6w/types";
import { asOptionalJson, ChatbaseClient, compact } from "../lib/client.ts";
import { agentIdParam } from "../lib/params.ts";

/**
 * `POST /agents/{agentId}/whatsapp/messages/template` — sends an approved
 * template to a phone number. No user ID is needed: a Chatbase user is
 * resolved or created from `to` automatically, and replies continue in that
 * user's conversation. `from` is optional only when the agent has exactly
 * one connected WhatsApp number.
 */
interface Input {
  agentId: string;
  to: string;
  from?: string;
  templateName: string;
  templateLanguage?: string;
  variables?: Record<string, Record<string, string>> | string;
}

const whatsappTemplateSend: ActionDefinition<Input> = {
  key: "whatsapp-template-send",
  type: "perform",
  resource: "whatsapp-template",
  title: "Send WhatsApp Template Message",
  description:
    "Send an approved WhatsApp template to a phone number from one of the agent's connected " +
    "numbers.",
  idempotent: false,
  params: [
    agentIdParam,
    {
      key: "to",
      label: "To",
      type: "string",
      required: true,
      hint: "Recipient phone number, international format. + and separators are tolerated.",
    },
    {
      key: "from",
      label: "From",
      type: "string",
      hint: "One of the agent's connected numbers. Optional when there is exactly one.",
    },
    {
      key: "templateName",
      label: "Template name",
      type: "string",
      required: true,
      hint: "Name of the approved template — see List WhatsApp Templates.",
    },
    {
      key: "templateLanguage",
      label: "Template language",
      type: "string",
      hint: "e.g. en_US. Optional when the template exists in a single language.",
    },
    {
      key: "variables",
      label: "Variables",
      type: "json",
      hint: 'Values for the template variables, grouped by component: {"header": {"1": "…"}, ' +
        '"body": {"1": "…"}}. Match the keys named in the template\'s own `variables` field.',
    },
  ],
  output: [
    { key: "messageId", type: "string", label: "WhatsApp message ID (wamid), or null" },
    { key: "conversationId", type: "string", label: "Conversation the replies continue in" },
    { key: "to", type: "string", label: "Canonical recipient WhatsApp ID" },
  ],

  execute(input, ctx) {
    const variables = asOptionalJson<Record<string, Record<string, string>>>(
      input.variables,
      "variables",
    );
    const body = compact({
      to: input.to,
      from: input.from,
      template: compact({
        name: input.templateName,
        language: input.templateLanguage,
        variables,
      }),
    });
    return new ChatbaseClient(ctx).request(
      `/agents/${encodeURIComponent(input.agentId)}/whatsapp/messages/template`,
      { method: "POST", body },
    );
  },
};

export default whatsappTemplateSend;
