import type { ActionDefinition } from "@w6w/types";
import { compact, GammaClient } from "../lib/client.ts";

/**
 * `GET /v1.0/templates/search` — verified against
 * `management/search-templates.md`. Returns two independent lists;
 * `workspaceTemplates` ids are usable as `gammaId` on Create Generation From
 * Template, `exploreTemplates` ids are not.
 */
interface Input {
  q?: string;
  limit?: number;
}

const searchTemplates: ActionDefinition<Input> = {
  key: "search-templates",
  type: "search",
  resource: "template",
  title: "Search Templates",
  description:
    "Search the caller's workspace templates and the official Gamma explore templates in one " +
    "request. Only workspaceTemplates ids can be passed as gammaId to Create Generation From " +
    "Template.",
  params: [
    {
      key: "q",
      label: "Query",
      type: "string",
      hint: "Omit to browse both lists in default order.",
    },
    {
      key: "limit",
      label: "Limit",
      type: "number",
      hint: "1-25, applied per list.",
      advanced: true,
    },
  ],
  output: [
    {
      key: "workspaceTemplates",
      type: "array",
      label: "Workspace templates — { id, title, url, previewUrl }",
    },
    {
      key: "workspaceDegraded",
      type: "boolean",
      label: "True when workspace results fell back to last-edited order",
    },
    {
      key: "exploreTemplates",
      type: "array",
      label: "Explore templates — { id, title, url, thumbnailUrl, previewUrl }",
    },
  ],

  execute(input, ctx) {
    return new GammaClient(ctx).request("/templates/search", {
      query: compact({ q: input.q, limit: input.limit }),
    });
  },
};

export default searchTemplates;
