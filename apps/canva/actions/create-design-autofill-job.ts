import type { ActionDefinition } from "@w6w/types";
import { CanvaClient } from "../lib/client.ts";

interface Input {
  source: "create_from_brand_template" | "create_from_design" | "update_design";
  brandTemplateId?: string;
  designId?: string;
  data: Record<string, unknown>;
}

/**
 * `POST /v1/autofills` — requires `design:content:write`. Rate limited to
 * 60 requests/minute per user.
 *
 * Requires the connected user to be a member of a Canva Enterprise
 * organization (or, while your integration is under development, a limited
 * free trial quota — see Canva's docs on Trial quotas).
 *
 * `data` is a map of field name -> typed value (image/video/text/chart/
 * sheet), passed straight through as Canva documents it — get the field
 * names/types first from `get-brand-template-dataset` or `get-design-dataset`.
 * A field name that doesn't exist on the target is silently skipped by
 * Canva, not rejected.
 *
 * ASYNCHRONOUS: returns `{ job: { id, status: "in_progress" } }`. Poll
 * `get-design-autofill-job` for the result.
 */
const createDesignAutofillJob: ActionDefinition<Input> = {
  key: "create-design-autofill-job",
  type: "perform",
  resource: "design",
  title: "Create Design Autofill Job",
  description: "Autofill a brand template or an existing design's data fields with images, " +
    "text, or tabular data. Requires Canva Enterprise (or a trial quota).",
  // create_from_brand_template/create_from_design mint a new design each
  // call; update_design mutates a specific design in place either way, so a
  // retry is never a safe no-op.
  idempotent: false,
  params: [
    {
      key: "source",
      label: "Source",
      type: "select",
      default: "create_from_brand_template",
      options: [
        { value: "create_from_brand_template", label: "Create a new design from a brand template" },
        { value: "create_from_design", label: "Create a new design from an existing design" },
        { value: "update_design", label: "Update an existing design in place" },
      ],
    },
    {
      key: "brandTemplateId",
      label: "Brand template ID",
      type: "string",
      hint: "For Source = 'Create a new design from a brand template'.",
      showIf: { "==": [{ var: "source" }, "create_from_brand_template"] },
    },
    {
      key: "designId",
      label: "Design ID",
      type: "string",
      hint: "For Source = 'Create a new design from an existing design' or 'Update an " +
        "existing design in place'.",
      showIf: { "in": [{ var: "source" }, ["create_from_design", "update_design"]] },
    },
    {
      key: "data",
      label: "Autofill data",
      type: "json",
      required: true,
      hint: 'Map of field name to typed value, e.g. { "headline": { "type": "text", ' +
        '"text": "Hello" }, "photo": { "type": "image", "asset_id": "Msd59349ff" } }. ' +
        "Field names/types come from get-brand-template-dataset or get-design-dataset.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Job ID" },
    { key: "status", type: "string", label: "Job status" },
  ],

  async execute(input, ctx) {
    const client = new CanvaClient(ctx);
    const body: Record<string, unknown> = { type: input.source, data: input.data };
    if (input.source === "create_from_brand_template") {
      body.brand_template_id = input.brandTemplateId;
    } else {
      body.design_id = input.designId;
    }

    const res = await client.request<{ job: Record<string, unknown> }>("/rest/v1/autofills", {
      method: "POST",
      body,
    });
    return res.job;
  },
};

export default createDesignAutofillJob;
