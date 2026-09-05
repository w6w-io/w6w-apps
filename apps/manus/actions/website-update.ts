import type { ActionDefinition } from "@w6w/types";
import { compact, ManusClient, type WebsiteUpdateResponse } from "../lib/client.ts";
import { publishVisibilityOptions } from "../lib/params.ts";

interface Input {
  taskId?: string;
  websiteId?: string;
  title?: string;
  visibility?: string;
}

/**
 * `POST /v2/website.update` — update a website's title and/or visibility
 * WITHOUT redeploying (unlike `website-publish`, only metadata and the CDN
 * are refreshed). `idempotent: true`: setting the same metadata twice
 * converges to the same end state.
 */
const websiteUpdate: ActionDefinition<Input, WebsiteUpdateResponse> = {
  key: "website-update",
  type: "perform",
  resource: "website",
  title: "Update Website",
  description: "Update a website's title or visibility without redeploying.",
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
    { key: "title", label: "Title", type: "string", hint: "Omit to leave unchanged." },
    {
      key: "visibility",
      label: "Visibility",
      type: "select",
      options: publishVisibilityOptions,
      hint: "Omit to leave unchanged.",
    },
  ],
  output: [],

  execute(input, ctx) {
    return new ManusClient(ctx).request<WebsiteUpdateResponse>("/v2/website.update", {
      method: "POST",
      body: compact({
        task_id: input.taskId,
        website_id: input.websiteId,
        title: input.title,
        visibility: input.visibility,
      }),
    });
  },
};

export default websiteUpdate;
