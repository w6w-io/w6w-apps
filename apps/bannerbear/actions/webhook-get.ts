import type { ActionDefinition } from "@w6w/types";
import { BannerbearClient } from "../lib/client.ts";

interface Webhook {
  uid: string;
  name: string;
  url: string;
  resource?: string;
  event?: string;
  status?: string;
  created_at?: string;
}

interface Input {
  uid: string;
}

/** `GET /webhooks/{uid}`. */
const action: ActionDefinition<Input, Webhook> = {
  key: "webhook-get",
  type: "read",
  resource: "webhook",
  title: "Get Webhook",
  description: "Get a Webhook's configuration.",
  params: [
    { key: "uid", label: "Webhook UID", type: "string", required: true },
  ],
  output: [
    { key: "uid", type: "string", label: "UID" },
    { key: "name", type: "string", label: "Name" },
    { key: "url", type: "string", label: "URL" },
    { key: "resource", type: "string", label: "Resource" },
    { key: "event", type: "string", label: "Event" },
    { key: "status", type: "string", label: "Status" },
  ],

  async execute(input, ctx) {
    const uid = String(input.uid ?? "").trim();
    if (!uid) throw new Error("`uid` is required");
    return await new BannerbearClient(ctx).json<Webhook>(`/webhooks/${encodeURIComponent(uid)}`);
  },
};

export default action;
