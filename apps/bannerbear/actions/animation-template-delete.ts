import type { ActionDefinition } from "@w6w/types";
import { BannerbearClient } from "../lib/client.ts";

interface Input {
  uid: string;
}

interface Output {
  uid: string;
  deleted: true;
}

/** `DELETE /animation_templates/{uid}`. Same 403/423 access-control shape as image templates. */
const action: ActionDefinition<Input, Output> = {
  key: "animation-template-delete",
  type: "perform",
  resource: "animation-template",
  title: "Delete Animation Template",
  description: "Delete an Animation Template. Idempotent in effect: a repeat call 404s harmlessly.",
  idempotent: true,
  params: [
    { key: "uid", label: "Template UID", type: "string", required: true },
  ],
  output: [
    { key: "uid", type: "string", label: "UID" },
    { key: "deleted", type: "boolean", label: "Deleted" },
  ],

  async execute(input, ctx) {
    const uid = String(input.uid ?? "").trim();
    if (!uid) throw new Error("`uid` is required");
    await new BannerbearClient(ctx).json(`/animation_templates/${encodeURIComponent(uid)}`, {
      method: "DELETE",
    });
    return { uid, deleted: true };
  },
};

export default action;
