import type { ActionDefinition } from "@w6w/types";
import { CanvaClient } from "../lib/client.ts";

interface Input {
  brandTemplateId: string;
}

/**
 * `GET /v1/brand-templates/{brandTemplateId}` — requires `brandtemplate:meta:read`.
 */
const getBrandTemplate: ActionDefinition<Input> = {
  key: "get-brand-template",
  type: "read",
  resource: "brand-template",
  title: "Get Brand Template",
  description: "Get a brand template's metadata (title, view/create URLs, thumbnail).",
  params: [
    { key: "brandTemplateId", label: "Brand template ID", type: "string", required: true },
  ],
  output: [
    { key: "id", type: "string", label: "Brand template ID" },
    { key: "title", type: "string", label: "Title" },
    { key: "view_url", type: "string", label: "View URL" },
    { key: "create_url", type: "string", label: "Create-a-design-from-this URL" },
    { key: "thumbnail", type: "object", label: "Thumbnail" },
  ],

  async execute(input, ctx) {
    const client = new CanvaClient(ctx);
    const res = await client.request<{ brand_template: Record<string, unknown> }>(
      `/rest/v1/brand-templates/${encodeURIComponent(input.brandTemplateId)}`,
    );
    return res.brand_template;
  },
};

export default getBrandTemplate;
