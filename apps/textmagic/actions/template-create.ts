import type { ActionDefinition } from "@w6w/types";
import { TextMagicClient } from "../lib/client.ts";

/**
 * `POST /api/v2/templates` — create a reusable message template.
 *
 * `content` may embed dynamic merge fields in braces (e.g. `{First name}`),
 * resolved by TextMagic at send time when the template is used via
 * `message-send`'s `templateId` — this app does not resolve them itself.
 */
interface Input {
  name: string;
  content: string;
}

const templateCreate: ActionDefinition<Input> = {
  key: "template-create",
  type: "perform",
  resource: "template",
  title: "Create Template",
  description: "Create a reusable message template.",
  idempotent: false,
  params: [
    { key: "name", label: "Name", type: "string", required: true },
    {
      key: "content",
      label: "Content",
      type: "text",
      required: true,
      hint: "May contain dynamic fields in braces, e.g. {First name}.",
    },
  ],
  output: [
    { key: "id", type: "number", label: "Template ID" },
    { key: "href", type: "string", label: "URI of the created template" },
  ],

  execute(input, ctx) {
    return new TextMagicClient(ctx).json("/templates", { method: "POST", body: input });
  },
};

export default templateCreate;
