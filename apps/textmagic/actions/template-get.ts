import type { ActionDefinition } from "@w6w/types";
import { TextMagicClient } from "../lib/client.ts";

/** `GET /api/v2/templates/{id}` — one template's details. */
interface Input {
  id: number;
}

const templateGet: ActionDefinition<Input> = {
  key: "template-get",
  type: "read",
  resource: "template",
  title: "Get Template",
  description: "Fetch one message template.",
  params: [{ key: "id", label: "Template ID", type: "number", required: true }],
  output: [
    { key: "id", type: "number", label: "Template ID" },
    { key: "name", type: "string", label: "Template name" },
    { key: "content", type: "string", label: "Template content" },
    { key: "lastModified", type: "string", label: "Last modified time" },
  ],

  execute(input, ctx) {
    return new TextMagicClient(ctx).json(`/templates/${encodeURIComponent(input.id)}`);
  },
};

export default templateGet;
