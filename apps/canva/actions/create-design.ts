import type { ActionDefinition } from "@w6w/types";
import { CanvaClient } from "../lib/client.ts";

interface Input {
  source: "type_and_asset" | "design" | "brand_template";
  presetName?: "doc" | "email" | "presentation" | "whiteboard";
  customWidth?: number;
  customHeight?: number;
  assetId?: string;
  title?: string;
  sourceDesignId?: string;
  sourceBrandTemplateId?: string;
  pageNumbers?: number[];
}

/**
 * `POST /v1/designs` — requires `design:content:write`. Rate limited to 20
 * requests/minute per user.
 *
 * Canva's request body is a discriminated union on `type`; this action
 * exposes it as one `Source` select rather than three actions, since all
 * three share the same endpoint, scope and success shape.
 *
 * A blank design (created via `type_and_asset` with no `asset_id`) is
 * auto-deleted by Canva if it isn't edited within 7 days — it bypasses the
 * user's trash and is permanently gone, not merely archived.
 *
 * Copying an existing design or a brand template (`source: "design"` /
 * `"brand_template"`) is a Canva **preview** feature: it may change without
 * a version bump, and integrations relying on it don't clear Canva's own
 * review process.
 */
const createDesign: ActionDefinition<Input> = {
  key: "create-design",
  type: "perform",
  resource: "design",
  title: "Create Design",
  description: "Create a new design from a preset/custom type, an asset, or a copy of an " +
    "existing design or brand template.",
  // Each call mints a new design with a new ID; retrying after a timeout
  // would create a duplicate rather than converge on the same result.
  idempotent: false,
  params: [
    {
      key: "source",
      label: "Source",
      type: "select",
      default: "type_and_asset",
      options: [
        { value: "type_and_asset", label: "Preset/custom type and/or an asset" },
        { value: "design", label: "Copy of an existing design (preview)" },
        { value: "brand_template", label: "Copy from a brand template (preview)" },
      ],
    },
    {
      key: "presetName",
      label: "Preset design type",
      type: "select",
      options: [
        { value: "doc", label: "Doc" },
        { value: "email", label: "Email" },
        { value: "presentation", label: "Presentation" },
        { value: "whiteboard", label: "Whiteboard" },
      ],
      hint: "For Source = 'Preset/custom type'. Leave empty and set custom width/height instead " +
        "for a custom-sized design. At least one of preset type, custom dimensions, or asset " +
        "must be given.",
      showIf: { "==": [{ var: "source" }, "type_and_asset"] },
    },
    {
      key: "customWidth",
      label: "Custom width (px)",
      type: "number",
      validation: { min: 40, max: 8000, integer: true },
      hint: "For Source = 'Preset/custom type', when not using a preset type. Width x height " +
        "must not exceed 25,000,000 px².",
      showIf: { "==": [{ var: "source" }, "type_and_asset"] },
    },
    {
      key: "customHeight",
      label: "Custom height (px)",
      type: "number",
      validation: { min: 40, max: 8000, integer: true },
      showIf: { "==": [{ var: "source" }, "type_and_asset"] },
    },
    {
      key: "assetId",
      label: "Asset ID to insert",
      type: "string",
      hint: "For Source = 'Preset/custom type'. Currently image assets only.",
      showIf: { "==": [{ var: "source" }, "type_and_asset"] },
    },
    {
      key: "title",
      label: "Title",
      type: "string",
      validation: { minLength: 1, maxLength: 255 },
      showIf: { "==": [{ var: "source" }, "type_and_asset"] },
    },
    {
      key: "sourceDesignId",
      label: "Source design ID",
      type: "string",
      required: false,
      hint: "For Source = 'Copy of an existing design'.",
      showIf: { "==": [{ var: "source" }, "design"] },
    },
    {
      key: "sourceBrandTemplateId",
      label: "Source brand template ID",
      type: "string",
      required: false,
      hint: "For Source = 'Copy from a brand template'.",
      showIf: { "==": [{ var: "source" }, "brand_template"] },
    },
    {
      key: "pageNumbers",
      label: "Page numbers to copy",
      type: "json",
      hint: "For Source = 'design' or 'brand_template'. Array of 1-based page numbers; omit to " +
        "copy every page.",
      showIf: { "in": [{ var: "source" }, ["design", "brand_template"]] },
    },
  ],
  output: [
    { key: "id", type: "string", label: "Design ID" },
    { key: "title", type: "string", label: "Title" },
    { key: "urls", type: "object", label: "Edit/view URLs" },
    { key: "thumbnail", type: "object", label: "Thumbnail" },
  ],

  async execute(input, ctx) {
    const client = new CanvaClient(ctx);

    let body: Record<string, unknown>;
    if (input.source === "design") {
      body = {
        type: "design",
        design_id: input.sourceDesignId,
        page_numbers: input.pageNumbers,
      };
    } else if (input.source === "brand_template") {
      body = {
        type: "brand_template",
        brand_template_id: input.sourceBrandTemplateId,
        page_numbers: input.pageNumbers,
      };
    } else {
      const designType = input.presetName
        ? { type: "preset", name: input.presetName }
        : input.customWidth && input.customHeight
        ? { type: "custom", width: input.customWidth, height: input.customHeight }
        : undefined;
      body = {
        type: "type_and_asset",
        design_type: designType,
        asset_id: input.assetId,
        title: input.title,
      };
    }

    const res = await client.request<{ design: Record<string, unknown> }>("/rest/v1/designs", {
      method: "POST",
      body,
    });
    return res.design;
  },
};

export default createDesign;
