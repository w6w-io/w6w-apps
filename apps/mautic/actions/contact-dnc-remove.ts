import type { ActionDefinition } from "@w6w/types";
import { MauticClient } from "../lib/client.ts";
import { CONTACT_ID_PARAM } from "../lib/params.ts";

/**
 * `POST /contacts/{id}/dnc/{channel}/remove` — verified against Mautic's REST
 * API docs (`contacts.html`, "Remove from Do Not Contact"). The response is
 * the full contact, same as Get Contact.
 */
const action: ActionDefinition = {
  key: "contact-dnc-remove",
  type: "perform",
  resource: "contact",
  title: "Remove a contact from Do Not Contact",
  description: "Re-enable a channel for a contact that was previously suppressed.",
  idempotent: true,
  params: [
    CONTACT_ID_PARAM,
    {
      key: "channel",
      label: "Channel",
      type: "string",
      default: "email",
      hint: "e.g. `email`, `sms`.",
    },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const id = Number(p.contactId);
    if (!Number.isFinite(id)) throw new Error("`contactId` must be a number");
    const channel = String(p.channel ?? "email").trim() || "email";

    ctx.log("info", "removing a Mautic contact from Do Not Contact", { id, channel });

    return await new MauticClient(ctx).request(
      `/contacts/${id}/dnc/${encodeURIComponent(channel)}/remove`,
      { method: "POST" },
    );
  },
};

export default action;
