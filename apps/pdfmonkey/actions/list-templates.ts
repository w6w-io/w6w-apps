import type { ActionDefinition } from "@w6w/types";
import { PdfMonkeyClient } from "../lib/client.ts";

interface Input {
  workspaceId: string;
  folders?: string;
  page?: number;
  sort?: string;
}

interface TemplateCard {
  id?: string;
  app_id?: string;
  auth_token?: string;
  created_at?: string;
  edition_mode?: string;
  identifier?: string;
  is_draft?: boolean;
  output_type?: string;
  pdf_engine_deprecated_on?: string | null;
  pdf_engine_name?: string;
  template_folder_id?: string | null;
  template_folder_identifier?: string | null;
  updated_at?: string;
}

interface Meta {
  current_page?: number;
  next_page?: number | null;
  prev_page?: number | null;
  total_pages?: number;
}

interface Output {
  document_template_cards: TemplateCard[];
  meta: Meta;
}

/**
 * `GET /api/v1/document_template_cards` — lightweight template cards
 * (omits body/styles/test data) for one workspace. `workspaceId` is
 * **required** by the vendor's own API — there is no account-wide list.
 *
 * Note: the vendor's own schema includes an `auth_token` field on each card
 * (documented "Internal. Not used."). This app passes the field through
 * unmodified in `document_template_cards`, since it is intentionally
 * different from the account's API secret key used to authenticate — but a
 * consumer of this action's output should treat it as opaque, per PDFMonkey.
 */
const listTemplates: ActionDefinition<Input, Output> = {
  key: "list-templates",
  type: "read",
  resource: "template",
  title: "List Templates",
  description: "List template cards for a workspace.",
  params: [
    {
      key: "workspaceId",
      label: "Workspace ID",
      type: "string",
      required: true,
      hint: "The app_id/workspace to list templates from.",
    },
    {
      key: "folders",
      label: "Folders",
      type: "string",
      hint:
        'Comma-separated folder IDs. "none" for unfiled templates, "all" (default) for every folder.',
    },
    { key: "page", label: "Page number", type: "number", validation: { min: 1, integer: true } },
    { key: "sort", label: "Sort by", type: "string" },
  ],
  output: [
    { key: "document_template_cards", type: "array", label: "Template cards" },
    { key: "meta", type: "object", label: "Pagination info" },
  ],

  execute(input, ctx) {
    const client = new PdfMonkeyClient(ctx);
    return client.request<Output>("/document_template_cards", {
      query: {
        "q[workspace_id]": input.workspaceId,
        "q[folders]": input.folders,
        page: input.page,
        sort: input.sort,
      },
    });
  },
};

export default listTemplates;
