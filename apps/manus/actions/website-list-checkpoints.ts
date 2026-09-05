import type { ActionDefinition } from "@w6w/types";
import { compact, ManusClient, type WebsiteListCheckpointsResponse } from "../lib/client.ts";

interface Input {
  taskId?: string;
  websiteId?: string;
}

interface Output {
  website_id: string;
  data: WebsiteListCheckpointsResponse["data"];
  published_version_id?: string;
}

/**
 * `GET /v2/website.listCheckpoints` — every checkpoint (git-commit-backed
 * snapshot) of a website, newest first. Not paginated in the vendor's
 * schema, so this is a `read` rather than a `search` action. Match
 * `published_version_id` against an entry's `version_id` to find the live
 * checkpoint.
 */
const websiteListCheckpoints: ActionDefinition<Input, Output> = {
  key: "website-list-checkpoints",
  type: "read",
  resource: "website",
  title: "List Website Checkpoints",
  description: "List a website's checkpoints, newest first.",
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
    { key: "data", type: "array", label: "Checkpoints, newest first" },
    { key: "published_version_id", type: "string", label: "The currently-live checkpoint's id" },
  ],

  async execute(input, ctx) {
    const res = await new ManusClient(ctx).request<WebsiteListCheckpointsResponse>(
      "/v2/website.listCheckpoints",
      { query: compact({ task_id: input.taskId, website_id: input.websiteId }) },
    );
    return {
      website_id: res.website_id,
      data: res.data,
      published_version_id: res.published_version_id,
    };
  },
};

export default websiteListCheckpoints;
