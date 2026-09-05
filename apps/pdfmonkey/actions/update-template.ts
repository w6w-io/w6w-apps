import type { ActionDefinition } from "@w6w/types";
import { PdfMonkeyClient } from "../lib/client.ts";

interface Input {
  templateId: string;
  identifier?: string;
  body?: string;
  bodyDraft?: string;
  scssStyle?: string;
  scssStyleDraft?: string;
  sampleData?: string;
  sampleDataDraft?: string;
  settings?: Record<string, unknown>;
  settingsDraft?: Record<string, unknown>;
  pdfEngineId?: string;
  pdfEngineDraftId?: string;
  templateFolderId?: string;
  ttl?: number;
  outputType?: "" | "pdf" | "image";
}

interface Template {
  id?: string;
  app_id?: string;
  identifier?: string;
  edition_mode?: string;
  output_type?: string;
  updated_at?: string;
  preview_url?: string;
}

interface Response {
  document_template: Template;
}

/**
 * `PUT /api/v1/document_templates/{id}` — update a template. Only the
 * fields included in the request are changed; everything else is left as
 * is. Accepts the same fields as `create-template`.
 */
const updateTemplate: ActionDefinition<Input, Template> = {
  key: "update-template",
  type: "perform",
  resource: "template",
  title: "Update Template",
  description: "Update a template's content, styles, settings, or engine.",
  idempotent: true,
  params: [
    {
      key: "templateId",
      label: "Template ID",
      type: "string",
      required: true,
      hint: "From the PDFMonkey dashboard, or the List Templates action.",
    },
    {
      key: "identifier",
      label: "Name",
      type: "string",
      validation: { minLength: 1, maxLength: 100 },
    },
    { key: "body", label: "Published HTML + Liquid", type: "text" },
    { key: "bodyDraft", label: "Draft HTML + Liquid", type: "text" },
    { key: "scssStyle", label: "Published CSS/SCSS", type: "text" },
    { key: "scssStyleDraft", label: "Draft CSS/SCSS", type: "text" },
    { key: "sampleData", label: "Published test data (JSON string)", type: "text" },
    { key: "sampleDataDraft", label: "Draft test data (JSON string)", type: "text" },
    { key: "settings", label: "Published settings", type: "json" },
    { key: "settingsDraft", label: "Draft settings", type: "json" },
    { key: "pdfEngineId", label: "PDF engine ID", type: "string", hint: "See List Engines." },
    { key: "pdfEngineDraftId", label: "Draft PDF engine ID", type: "string" },
    { key: "templateFolderId", label: "Folder ID", type: "string" },
    {
      key: "ttl",
      label: "Time-to-live (seconds)",
      type: "number",
      validation: { min: 0, integer: true },
    },
    {
      key: "outputType",
      label: "Output type",
      type: "select",
      options: [
        { value: "", label: "Leave unchanged" },
        { value: "pdf", label: "PDF" },
        { value: "image", label: "Image" },
      ],
    },
  ],
  output: [
    { key: "id", type: "string", label: "Template ID" },
    { key: "identifier", type: "string", label: "Name" },
    { key: "updated_at", type: "string", label: "Updated at" },
  ],

  async execute(input, ctx) {
    const client = new PdfMonkeyClient(ctx);
    const res = await client.request<Response>(`/document_templates/${input.templateId}`, {
      method: "PUT",
      body: {
        document_template: {
          identifier: input.identifier || undefined,
          body: input.body,
          body_draft: input.bodyDraft,
          scss_style: input.scssStyle,
          scss_style_draft: input.scssStyleDraft,
          sample_data: input.sampleData,
          sample_data_draft: input.sampleDataDraft,
          settings: input.settings,
          settings_draft: input.settingsDraft,
          pdf_engine_id: input.pdfEngineId || undefined,
          pdf_engine_draft_id: input.pdfEngineDraftId || undefined,
          template_folder_id: input.templateFolderId || undefined,
          ttl: input.ttl,
          output_type: input.outputType || undefined,
        },
      },
    });
    return res.document_template;
  },
};

export default updateTemplate;
