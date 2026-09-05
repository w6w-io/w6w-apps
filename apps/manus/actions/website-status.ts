import type { ActionDefinition } from "@w6w/types";
import { compact, ManusClient, type WebsiteStatusResponse } from "../lib/client.ts";

interface Input {
  taskId?: string;
  websiteId?: string;
}

/**
 * `GET /v2/website.status` — a website's publish status, live URLs and
 * visibility. Provide exactly one of Task ID (the task must contain exactly
 * one website) or Website ID.
 */
const websiteStatus: ActionDefinition<Input, WebsiteStatusResponse> = {
  key: "website-status",
  type: "read",
  resource: "website",
  title: "Get Website Status",
  description: "Get a website's publish status, live URLs and visibility.",
  params: [
    {
      key: "taskId",
      label: "Task ID",
      type: "string",
      hint: "The task that built the site. Mutually exclusive with Website ID.",
    },
    {
      key: "websiteId",
      label: "Website ID",
      type: "string",
      hint: "From a prior website-status or website-publish call. Mutually exclusive with Task ID.",
    },
  ],
  output: [
    { key: "website_id", type: "string", label: "Website ID" },
    {
      key: "publish_status",
      type: "string",
      label: "unpublished | publishing | published | failed",
    },
    { key: "site_urls", type: "array", label: "Live URLs, empty unless published" },
    { key: "version_id", type: "string", label: "Currently-deployed checkpoint version" },
    {
      key: "status_updated_at",
      type: "number",
      label: "Unix seconds — last publish-status change",
    },
    { key: "visibility", type: "string", label: "public | team | private" },
  ],

  execute(input, ctx) {
    return new ManusClient(ctx).request<WebsiteStatusResponse>("/v2/website.status", {
      query: compact({ task_id: input.taskId, website_id: input.websiteId }),
    });
  },
};

export default websiteStatus;
