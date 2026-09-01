import type { ActionDefinition } from "@w6w/types";
import { TableauClient } from "../lib/client.ts";

/**
 * `GET /sites/{siteId}/views/{viewId}/image` — verified against Tableau's
 * "Query View Image" reference page.
 *
 * Answers a binary image (`image/png` by default), not JSON — the `Accept:
 * application/json` header this app sends everywhere else has no effect
 * here, since there is no JSON representation of a rendered image. The
 * sandbox has no filesystem to write to, so the bytes come back as base64.
 *
 * "If you make multiple requests for an image, subsequent calls return a
 * cached version" (the vendor's own note) — `maxAge` is exposed so a
 * workflow that needs a fresher render can ask for one.
 */
const action: ActionDefinition = {
  key: "view-image-get",
  type: "read",
  resource: "view",
  title: "Get a view's image",
  description: "Render a view to a PNG image, returned as base64.",
  params: [
    { key: "viewId", label: "View ID", type: "string", required: true },
    {
      key: "resolution",
      label: "Resolution",
      type: "select",
      default: "",
      options: [
        { value: "", label: "Default" },
        { value: "high", label: "High" },
      ],
      advanced: true,
    },
    {
      key: "maxAgeMinutes",
      label: "Max Cache Age (minutes)",
      type: "number",
      default: undefined,
      advanced: true,
      hint: "Minimum is 1. Omit to accept Tableau's default image cache.",
    },
  ],
  output: [
    { key: "base64", type: "string", label: "Image (base64)" },
    { key: "contentType", type: "string", label: "Content type" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const viewId = String(p.viewId ?? "").trim();
    if (!viewId) throw new Error("`viewId` is required");

    ctx.log("info", "rendering a Tableau view image", { viewId });

    return await new TableauClient(ctx).requestBinary(
      `/views/${encodeURIComponent(viewId)}/image`,
      {
        query: {
          resolution: (p.resolution as string) || undefined,
          maxAge: p.maxAgeMinutes !== undefined && p.maxAgeMinutes !== null
            ? Number(p.maxAgeMinutes)
            : undefined,
        },
      },
    );
  },
};

export default action;
