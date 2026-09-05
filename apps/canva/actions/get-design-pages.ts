import type { ActionDefinition } from "@w6w/types";
import { CanvaClient } from "../lib/client.ts";

interface Input {
  designId: string;
  offset?: number;
  limit?: number;
}

/**
 * `GET /v1/designs/{designId}/pages` — requires `design:content:read`. Canva
 * flags this endpoint a **preview API**: it may change without a version
 * bump and integrations using it don't clear Canva's own review process.
 * Included anyway because it's genuinely useful and currently live; noted
 * here and in the README so a caller isn't surprised.
 */
const getDesignPages: ActionDefinition<Input> = {
  key: "get-design-pages",
  type: "read",
  resource: "design",
  title: "Get Design Pages",
  description:
    "List per-page metadata (thumbnails, dimensions) for a design. Preview API — see description.",
  params: [
    { key: "designId", label: "Design ID", type: "string", required: true },
    {
      key: "offset",
      label: "Offset",
      type: "number",
      default: 1,
      validation: { min: 1, max: 500, integer: true },
      hint: "1-based page index to start from.",
    },
    {
      key: "limit",
      label: "Limit",
      type: "number",
      default: 50,
      validation: { min: 1, max: 200, integer: true },
    },
  ],
  output: [{ key: "items", type: "array", label: "Pages" }],

  execute(input, ctx) {
    const client = new CanvaClient(ctx);
    return client.request(`/rest/v1/designs/${encodeURIComponent(input.designId)}/pages`, {
      query: { offset: input.offset, limit: input.limit },
    });
  },
};

export default getDesignPages;
