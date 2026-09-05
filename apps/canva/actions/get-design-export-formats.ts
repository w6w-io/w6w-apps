import type { ActionDefinition } from "@w6w/types";
import { CanvaClient } from "../lib/client.ts";

interface Input {
  designId: string;
}

/**
 * `GET /v1/designs/{designId}/export-formats` — requires `design:content:read`.
 * Returns which file formats this specific design can export as, and (when a
 * format isn't supported by every page) the page numbers it IS supported on
 * — useful to check before calling `create-design-export-job` with a format
 * that would otherwise fail.
 */
const getDesignExportFormats: ActionDefinition<Input> = {
  key: "get-design-export-formats",
  type: "read",
  resource: "design",
  title: "Get Design Export Formats",
  description: "List the file formats a design can be exported as.",
  params: [
    { key: "designId", label: "Design ID", type: "string", required: true },
  ],
  output: [{ key: "formats", type: "object", label: "Available export formats" }],

  execute(input, ctx) {
    const client = new CanvaClient(ctx);
    return client.request(
      `/rest/v1/designs/${encodeURIComponent(input.designId)}/export-formats`,
    );
  },
};

export default getDesignExportFormats;
