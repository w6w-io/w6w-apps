import type { ActionDefinition } from "@w6w/types";
import { BannerbearClient } from "../lib/client.ts";

interface Input {
  uid: string;
}

interface Output {
  uid: string;
  deleted: true;
}

/** `DELETE /webhooks/{uid}`. */
const action: ActionDefinition<Input, Output> = {
  key: "webhook-delete",
  type: "perform",
  resource: "webhook",
  title: "Delete Webhook",
  description: "Delete a Webhook. Idempotent in effect: a repeat call 404s harmlessly.",
  idempotent: true,
  params: [
    { key: "uid", label: "Webhook UID", type: "string", required: true },
  ],
  output: [
    { key: "uid", type: "string", label: "UID" },
    { key: "deleted", type: "boolean", label: "Deleted" },
  ],

  async execute(input, ctx) {
    const uid = String(input.uid ?? "").trim();
    if (!uid) throw new Error("`uid` is required");
    await new BannerbearClient(ctx).json(`/webhooks/${encodeURIComponent(uid)}`, {
      method: "DELETE",
    });
    return { uid, deleted: true };
  },
};

export default action;
