import type { ActionDefinition } from "@w6w/types";
import { HeyGenClient } from "../lib/client.ts";

interface Input {
  templateId: string;
}

/**
 * `GET /v3/templates/{template_id}` — a template's variable schema (name, type, and current
 * default value per variable) and scene list. Read this before `template-video-generate` to know
 * which variable names and types the template actually accepts.
 */
const templateGet: ActionDefinition<Input> = {
  key: "template-get",
  type: "read",
  resource: "template",
  title: "Get Template",
  description: "Fetch a template's variable schema and scenes.",
  params: [{ key: "templateId", label: "Template ID", type: "string", required: true }],
  output: [{ key: "data", type: "object", label: "The template" }],

  execute(input, ctx) {
    const client = new HeyGenClient(ctx);
    return client.data(`/v3/templates/${encodeURIComponent(input.templateId)}`);
  },
};

export default templateGet;
