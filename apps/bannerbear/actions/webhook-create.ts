import type { ActionDefinition } from "@w6w/types";
import { BannerbearClient, compact } from "../lib/client.ts";
import {
  webhookEventOptions,
  webhookResourceOptions,
  webhookStatusOptions,
} from "../lib/params.ts";

interface Webhook {
  uid: string;
  name: string;
  url: string;
  resource?: string;
  event?: string;
  status?: string;
}

interface Input {
  name: string;
  url: string;
  resource?: string;
  event?: string;
  status?: string;
}

/**
 * `POST /webhooks` — subscribe to a resource's lifecycle instead of polling
 * its `GET` endpoint. Cheaper than polling for anything longer than a quick
 * image render, and required for animations/tool jobs/workflow runs that
 * take more than a few seconds.
 */
const action: ActionDefinition<Input, Webhook> = {
  key: "webhook-create",
  type: "perform",
  resource: "webhook",
  title: "Create Webhook",
  description: "Register a Webhook. Not idempotent — every call creates a new one.",
  idempotent: false,
  params: [
    { key: "name", label: "Name", type: "string", required: true },
    {
      key: "url",
      label: "URL",
      type: "string",
      required: true,
      placeholder: "https://example.com/hooks/bannerbear",
    },
    {
      key: "resource",
      label: "Resource",
      type: "select",
      options: webhookResourceOptions,
      hint: "Which resource type triggers this webhook.",
    },
    {
      key: "event",
      label: "Event",
      type: "select",
      options: webhookEventOptions,
    },
    {
      key: "status",
      label: "Status",
      type: "select",
      options: webhookStatusOptions,
      default: "active",
    },
  ],
  output: [
    { key: "uid", type: "string", label: "UID" },
    { key: "name", type: "string", label: "Name" },
  ],

  async execute(input, ctx) {
    const name = String(input.name ?? "").trim();
    const url = String(input.url ?? "").trim();
    if (!name) throw new Error("`name` is required");
    if (!url) throw new Error("`url` is required");

    return await new BannerbearClient(ctx).json<Webhook>("/webhooks", {
      method: "POST",
      body: compact({
        name,
        url,
        resource: input.resource,
        event: input.event,
        status: input.status,
      }),
    });
  },
};

export default action;
