import type { ActionDefinition } from "@w6w/types";
import { CanvaClient } from "../lib/client.ts";

interface Input {
  designId: string;
}

/**
 * `GET /v1/designs/{designId}` — requires `design:meta:read`.
 */
const getDesign: ActionDefinition<Input> = {
  key: "get-design",
  type: "read",
  resource: "design",
  title: "Get Design",
  description: "Get the metadata for one of the user's designs.",
  params: [
    { key: "designId", label: "Design ID", type: "string", required: true },
  ],
  output: [
    { key: "id", type: "string", label: "Design ID" },
    { key: "title", type: "string", label: "Title" },
    { key: "urls", type: "object", label: "Edit/view URLs" },
    { key: "thumbnail", type: "object", label: "Thumbnail" },
    { key: "page_count", type: "number", label: "Page count" },
    { key: "design_types", type: "array", label: "Design types" },
  ],

  async execute(input, ctx) {
    const client = new CanvaClient(ctx);
    const res = await client.request<{ design: Record<string, unknown> }>(
      `/rest/v1/designs/${encodeURIComponent(input.designId)}`,
    );
    return res.design;
  },
};

export default getDesign;
