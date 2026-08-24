import type { ActionDefinition } from "@w6w/types";
import { asOptionalJson, compact, HeyGenClient } from "../lib/client.ts";

interface Input {
  templateId: string;
  variables?: string | Record<string, unknown>;
  title?: string;
  caption?: boolean;
  callbackUrl?: string;
  callbackId?: string;
  folderId?: string;
}

/**
 * `POST /v3/templates/{template_id}` — render a template with variable substitutions.
 * `variables` is a discriminated union keyed by the template's OWN variable names (each entry
 * shaped `{"type": "text"|"image"|"video"|"audio"|"character"|"voice", ...}`) — fetch
 * `template-get` first to see what a given template actually defines and expects. An omitted
 * text variable leaves its literal `{{variable_name}}` placeholder in place rather than
 * substituting anything; omitting an image/video/audio/character/voice variable safely keeps the
 * template's current value.
 */
const templateVideoGenerate: ActionDefinition<Input> = {
  key: "template-video-generate",
  type: "perform",
  resource: "template",
  title: "Generate Video from Template",
  description:
    "Render a template with variable substitutions. Fetch Get Template first to see the " +
    "variable names and types it defines. Returns immediately with a video_id in a pending " +
    "status.",
  idempotent: false,
  params: [
    { key: "templateId", label: "Template ID", type: "string", required: true },
    {
      key: "variables",
      label: "Variables",
      type: "json",
      hint: 'Keyed by the template\'s variable names, e.g. {"headline": {"type": "text", ' +
        '"text": "Q3 Results"}}. Omit a key to keep the template\'s current value there. See ' +
        "Get Template for the template's own variable names and types.",
    },
    { key: "title", label: "Title", type: "string" },
    { key: "caption", label: "Burn in captions", type: "boolean", default: false },
    { key: "callbackUrl", label: "Webhook callback URL", type: "string" },
    { key: "callbackId", label: "Callback ID", type: "string" },
    { key: "folderId", label: "Folder ID", type: "string" },
  ],
  output: [{ key: "data", type: "object", label: "The generated video" }],

  execute(input, ctx) {
    const variables = asOptionalJson<Record<string, unknown>>(input.variables, "variables") ?? {};

    const client = new HeyGenClient(ctx);
    return client.data(`/v3/templates/${encodeURIComponent(input.templateId)}`, {
      method: "POST",
      body: compact({
        variables,
        title: input.title,
        caption: input.caption,
        callback_url: input.callbackUrl,
        callback_id: input.callbackId,
        folder_id: input.folderId,
      }),
    });
  },
};

export default templateVideoGenerate;
