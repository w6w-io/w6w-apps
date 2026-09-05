import type { ActionDefinition } from "@w6w/types";
import { compact, ManusClient, type WebsitePublishResponse } from "../lib/client.ts";
import { publishVisibilityOptions } from "../lib/params.ts";

interface Input {
  taskId?: string;
  websiteId?: string;
  visibility?: string;
}

/**
 * `POST /v2/website.publish` — deploy a website's latest checkpoint and set
 * its visibility. Deployment is asynchronous; poll `website-status` until
 * `publish_status` is `published` or `failed`.
 *
 * `idempotent: true`: this always redeploys the site's current latest
 * checkpoint — a retry deploys that same checkpoint again, converging on the
 * same published state, rather than accumulating a distinct effect the way
 * `task-create` does.
 */
const websitePublish: ActionDefinition<Input, WebsitePublishResponse> = {
  key: "website-publish",
  type: "perform",
  resource: "website",
  title: "Publish Website",
  description: "Deploy a website's latest checkpoint.",
  idempotent: true,
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
      hint: "Mutually exclusive with Task ID.",
    },
    {
      key: "visibility",
      label: "Visibility",
      type: "select",
      options: publishVisibilityOptions,
      default: "public",
      hint:
        "A site may cap its own maximum allowed visibility; exceeding it returns a permission " +
        "error.",
    },
  ],
  output: [
    { key: "website_id", type: "string", label: "Website ID" },
    { key: "version_id", type: "string", label: "Checkpoint version being deployed" },
  ],

  execute(input, ctx) {
    return new ManusClient(ctx).request<WebsitePublishResponse>("/v2/website.publish", {
      method: "POST",
      body: compact({
        task_id: input.taskId,
        website_id: input.websiteId,
        visibility: input.visibility,
      }),
    });
  },
};

export default websitePublish;
