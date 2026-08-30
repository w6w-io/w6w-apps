import type { ActionDefinition } from "@w6w/types";
import { MauticClient } from "../lib/client.ts";
import { CONTACT_ID_PARAM } from "../lib/params.ts";

/**
 * `DELETE /contacts/{id}/delete` — verified against Mautic's REST API docs
 * (`contacts.html`, "Delete Contact").
 *
 * **This is the most destructive call in the app**, and a self-hosted
 * instance has no trash to recover a deleted contact from — every point,
 * segment membership, campaign history and Do Not Contact record goes with
 * it. So it requires an explicit confirmation, the same gate this pack uses
 * for `gitea`'s `repo-delete` and `file-delete`.
 */
const action: ActionDefinition = {
  key: "contact-delete",
  type: "perform",
  resource: "contact",
  title: "Delete a contact",
  description: "Permanently delete a contact and its history.",
  idempotent: true,
  params: [
    CONTACT_ID_PARAM,
    {
      key: "confirm",
      label: "I understand this contact's history cannot be recovered",
      type: "boolean",
      required: true,
      default: false,
      hint: "Must be on. There is no trash to restore a deleted contact from.",
    },
  ],
  output: [
    { key: "id", type: "number", label: "ID" },
    { key: "deleted", type: "boolean", label: "Deleted" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const id = Number(p.contactId);
    if (!Number.isFinite(id)) throw new Error("`contactId` must be a number");
    if (p.confirm !== true) {
      throw new Error("`confirm` must be true — deleting a contact cannot be undone");
    }

    ctx.log("warn", "deleting a Mautic contact", { id });

    await new MauticClient(ctx).request(`/contacts/${id}/delete`, { method: "DELETE" });
    return { id, deleted: true };
  },
};

export default action;
