import type { ActionDefinition } from "@w6w/types";
import { PdfMonkeyClient } from "../lib/client.ts";

interface Input {
  workspaceId: string;
  identifier: string;
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
  editionMode?: "" | "code" | "builder";
  outputType?: "" | "pdf" | "image";
}

interface Template {
  id?: string;
  app_id?: string;
  identifier?: string;
  edition_mode?: string;
  output_type?: string;
  created_at?: string;
  updated_at?: string;
  preview_url?: string;
}

interface Response {
  document_template: Template;
}

/**
 * `POST /api/v1/document_templates` — create a template. PDFMonkey's own
 * docs are explicit that most users should design templates in the
 * Dashboard or visual Builder instead; this exists for programmatic
 * workflows (e.g. syncing from a CI pipeline).
 */
const createTemplate: ActionDefinition<Input, Template> = {
  key: "create-template",
  type: "perform",
  resource: "template",
  title: "Create Template",
  description: "Create a template. Most users should design templates in the Dashboard instead.",
  idempotent: false,
  params: [
    {
      key: "workspaceId",
      label: "Workspace ID",
      type: "string",
      required: true,
      hint: "The workspace (app_id) to create the template in.",
    },
    {
      key: "identifier",
      label: "Name",
      type: "string",
      required: true,
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
      key: "editionMode",
      label: "Edition mode",
      type: "select",
      options: [
        { value: "", label: "Code (default)" },
        { value: "builder", label: "Builder" },
      ],
    },
    {
      key: "outputType",
      label: "Output type",
      type: "select",
      options: [
        { value: "", label: "PDF (default)" },
        { value: "image", label: "Image" },
      ],
    },
  ],
  output: [
    { key: "id", type: "string", label: "Template ID" },
    { key: "identifier", type: "string", label: "Name" },
    { key: "preview_url", type: "string", label: "Preview URL" },
  ],

  async execute(input, ctx) {
    const client = new PdfMonkeyClient(ctx);
    const res = await client.request<Response>("/document_templates", {
      method: "POST",
      body: {
        document_template: {
          app_id: input.workspaceId,
          identifier: input.identifier,
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
          edition_mode: input.editionMode || undefined,
          output_type: input.outputType || undefined,
        },
      },
    });
    return res.document_template;
  },
};

export default createTemplate;
