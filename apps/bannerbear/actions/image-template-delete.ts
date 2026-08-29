import type { ActionDefinition } from "@w6w/types";
import { BannerbearClient } from "../lib/client.ts";

interface Input {
  uid: string;
}

interface Output {
  uid: string;
  deleted: true;
}

/**
 * `DELETE /image_templates/{uid}` — answers `200` with no documented body.
 * 423 means `api_write_access: "nobody"` (owner must unlock in the
 * dashboard); 403 means `owner_only` and this key is not the owner.
 */
const action: ActionDefinition<Input, Output> = {
  key: "image-template-delete",
  type: "perform",
  resource: "image-template",
  title: "Delete Image Template",
  description: "Delete an Image Template. Idempotent in effect: a repeat call 404s harmlessly.",
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
    await new BannerbearClient(ctx).json(`/image_templates/${encodeURIComponent(uid)}`, {
      method: "DELETE",
    });
    return { uid, deleted: true };
  },
};

export default action;
