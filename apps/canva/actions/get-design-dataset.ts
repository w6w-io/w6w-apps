import type { ActionDefinition } from "@w6w/types";
import { CanvaClient } from "../lib/client.ts";

interface Input {
  designId: string;
}

/**
 * `GET /v1/designs/{designId}/dataset` — requires `design:content:read`.
 * Lists the autofillable data fields (image/text/chart) a design accepts, if
 * any — the field names/types this returns are exactly what
 * `create-design-autofill-job` (with `type: create_from_design`) needs.
 */
const getDesignDataset: ActionDefinition<Input> = {
  key: "get-design-dataset",
  type: "read",
  resource: "design",
  title: "Get Design Dataset",
  description: "Check whether a design has autofillable fields and what type of data they accept.",
  params: [
    { key: "designId", label: "Design ID", type: "string", required: true },
  ],
  output: [{ key: "dataset", type: "object", label: "Data field definitions" }],

  execute(input, ctx) {
    const client = new CanvaClient(ctx);
    return client.request(`/rest/v1/designs/${encodeURIComponent(input.designId)}/dataset`);
  },
};

export default getDesignDataset;
