import type { ActionDefinition } from "@w6w/types";
import { BannerbearClient } from "../lib/client.ts";

interface Input {
  uid: string;
}

interface Output {
  uid: string;
  deleted: true;
}

/** `DELETE /instant_urls/{uid}`. */
const action: ActionDefinition<Input, Output> = {
  key: "instant-url-delete",
  type: "perform",
  resource: "instant-url",
  title: "Delete Instant URL",
  description: "Delete an Instant URL. Idempotent in effect: a repeat call 404s harmlessly.",
  idempotent: true,
  params: [
    { key: "uid", label: "Instant URL UID", type: "string", required: true },
  ],
  output: [
    { key: "uid", type: "string", label: "UID" },
    { key: "deleted", type: "boolean", label: "Deleted" },
  ],

  async execute(input, ctx) {
    const uid = String(input.uid ?? "").trim();
    if (!uid) throw new Error("`uid` is required");
    await new BannerbearClient(ctx).json(`/instant_urls/${encodeURIComponent(uid)}`, {
      method: "DELETE",
    });
    return { uid, deleted: true };
  },
};

export default action;
