import type { ActionDefinition } from "@w6w/types";
import { CanvaClient } from "../lib/client.ts";

interface Input {
  brandTemplateId: string;
}

/**
 * `GET /v1/brand-templates/{brandTemplateId}/dataset` — requires
 * `brandtemplate:content:read`. The field names/types this returns are
 * exactly what `create-design-autofill-job` (with
 * `source: create_from_brand_template`) needs in its `data` map.
 */
const getBrandTemplateDataset: ActionDefinition<Input> = {
  key: "get-brand-template-dataset",
  type: "read",
  resource: "brand-template",
  title: "Get Brand Template Dataset",
  description: "Check whether a brand template has autofillable fields and what type of data " +
    "they accept.",
  params: [
    { key: "brandTemplateId", label: "Brand template ID", type: "string", required: true },
  ],
  output: [{ key: "dataset", type: "object", label: "Data field definitions" }],

  execute(input, ctx) {
    const client = new CanvaClient(ctx);
    return client.request(
      `/rest/v1/brand-templates/${encodeURIComponent(input.brandTemplateId)}/dataset`,
    );
  },
};

export default getBrandTemplateDataset;
