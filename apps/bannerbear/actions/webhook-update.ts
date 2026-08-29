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
  uid: string;
  name: string;
  url: string;
  resource?: string;
  event?: string;
  status?: string;
}

/**
 * `PATCH /webhooks/{uid}`. `name` and `url` are documented as required on this
 * endpoint even though it is a partial update — Bannerbear replaces the whole
 * record rather than merging, so both must be resent even when unchanged.
 */
const action: ActionDefinition<Input, Webhook> = {
  key: "webhook-update",
  type: "perform",
  resource: "webhook",
  title: "Update Webhook",
  description:
    "Update a Webhook. Bannerbear requires name and url even when unchanged — this replaces " +
    "the record, it does not merge partial fields.",
  idempotent: true,
  params: [
    { key: "uid", label: "Webhook UID", type: "string", required: true },
    { key: "name", label: "Name", type: "string", required: true },
    { key: "url", label: "URL", type: "string", required: true },
    { key: "resource", label: "Resource", type: "select", options: webhookResourceOptions },
    { key: "event", label: "Event", type: "select", options: webhookEventOptions },
    { key: "status", label: "Status", type: "select", options: webhookStatusOptions },
  ],
  output: [
    { key: "uid", type: "string", label: "UID" },
    { key: "name", type: "string", label: "Name" },
  ],

  async execute(input, ctx) {
    const uid = String(input.uid ?? "").trim();
    const name = String(input.name ?? "").trim();
    const url = String(input.url ?? "").trim();
    if (!uid) throw new Error("`uid` is required");
    if (!name) throw new Error("`name` is required");
    if (!url) throw new Error("`url` is required");

    return await new BannerbearClient(ctx).json<Webhook>(`/webhooks/${encodeURIComponent(uid)}`, {
      method: "PATCH",
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
