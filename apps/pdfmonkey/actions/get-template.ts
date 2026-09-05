import type { ActionDefinition } from "@w6w/types";
import { PdfMonkeyClient } from "../lib/client.ts";

interface Input {
  templateId: string;
}

interface Settings {
  footer?: {
    center?: string | null;
    content?: string | null;
    left?: string | null;
    right?: string | null;
  };
  header?: {
    center?: string | null;
    content?: string | null;
    left?: string | null;
    right?: string | null;
  };
  inject_javascript?: boolean;
  margin?: { bottom?: number; left?: number; right?: number; top?: number };
  orientation?: string;
  paper_format?: string;
  paper_height?: number;
  paper_width?: number;
  transparent_background?: boolean;
  use_emojis?: boolean;
  use_paged?: boolean;
}

interface Template {
  id?: string;
  app_id?: string;
  identifier?: string;
  edition_mode?: string;
  output_type?: string;
  body?: string;
  body_draft?: string;
  scss_style?: string;
  scss_style_draft?: string;
  sample_data?: string;
  sample_data_draft?: string;
  settings?: Settings;
  settings_draft?: Settings;
  pdf_engine_id?: string;
  pdf_engine_draft_id?: string;
  template_folder_id?: string | null;
  ttl?: number;
  created_at?: string;
  updated_at?: string;
  checksum?: string;
  preview_url?: string;
}

interface Response {
  document_template: Template;
}

/**
 * `GET /api/v1/document_templates/{id}` — the full template, including
 * published (`body`/`scss_style`/`settings`/...) and draft counterparts.
 * When you publish a template in the Dashboard, draft values are copied to
 * their published fields; generation always uses the published ones.
 */
const getTemplate: ActionDefinition<Input, Template> = {
  key: "get-template",
  type: "read",
  resource: "template",
  title: "Get Template",
  description: "Fetch a template's HTML, styles, settings, and PDF engine.",
  params: [
    {
      key: "templateId",
      label: "Template ID",
      type: "string",
      required: true,
      hint: "From the PDFMonkey dashboard, or the List Templates action.",
    },
  ],
  output: [
    { key: "identifier", type: "string", label: "Name" },
    { key: "output_type", type: "string", label: "Output type (pdf or image)" },
    { key: "body", type: "string", label: "Published HTML + Liquid content" },
    { key: "settings", type: "object", label: "Published print settings" },
    { key: "preview_url", type: "string", label: "Preview URL" },
  ],

  async execute(input, ctx) {
    const client = new PdfMonkeyClient(ctx);
    const res = await client.request<Response>(`/document_templates/${input.templateId}`);
    return res.document_template;
  },
};

export default getTemplate;
