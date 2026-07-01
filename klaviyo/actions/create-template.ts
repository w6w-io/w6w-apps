import type { ActionDefinition } from "@w6w/types";
import { KlaviyoClient, type KlaviyoEnvelope } from "../lib/client.ts";

interface Input {
  name: string;
  editorType?: "CODE" | "USER" | "DRAG_DROP";
  html?: string;
  text?: string;
  ampBody?: string;
}

const createTemplate: ActionDefinition<Input, KlaviyoEnvelope> = {
  key: "create-template",
  type: "perform",
  resource: "template",
  title: "Create Template",
  description: "Create a new email template.",
  params: [
    { key: "name", label: "Name", type: "string", required: true },
    {
      key: "editorType",
      label: "Editor type",
      type: "select",
      default: "CODE",
      options: [
        { value: "CODE", label: "Code (HTML)" },
        { value: "USER", label: "User (classic editor)" },
        { value: "DRAG_DROP", label: "Drag-and-drop" },
      ],
    },
    { key: "html", label: "HTML body", type: "text", ui: "code:html" },
    { key: "text", label: "Plain-text body", type: "text" },
    { key: "ampBody", label: "AMP body", type: "text" },
  ],

  async execute(input, ctx) {
    const client = new KlaviyoClient(ctx);
    const attributes: Record<string, unknown> = {
      name: input.name,
      editor_type: input.editorType ?? "CODE",
    };
    if (input.html !== undefined) attributes.html = input.html;
    if (input.text !== undefined) attributes.text = input.text;
    if (input.ampBody !== undefined) attributes.amp = input.ampBody;

    return client.request<KlaviyoEnvelope>(`/templates/`, {
      method: "POST",
      body: {
        data: {
          type: "template",
          attributes,
        },
      },
    });
  },
};

export default createTemplate;
