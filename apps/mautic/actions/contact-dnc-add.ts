import type { ActionDefinition } from "@w6w/types";
import { compact, MauticClient } from "../lib/client.ts";
import { CONTACT_ID_PARAM } from "../lib/params.ts";

/**
 * `POST /contacts/{id}/dnc/{channel}/add` — verified against Mautic's REST
 * API docs (`contacts.html`, "Add Do Not Contact"). `reason` is one of
 * Mautic's own `Contacts` constants: `UNSUBSCRIBED` (1), `BOUNCED` (2),
 * `MANUAL` (3, the default).
 */
const action: ActionDefinition = {
  key: "contact-dnc-add",
  type: "perform",
  resource: "contact",
  title: "Add a contact to Do Not Contact",
  description: "Suppress a contact on a channel — unsubscribe, bounce or a manual entry.",
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
    {
      key: "reason",
      label: "Reason",
      type: "select",
      default: "3",
      options: [
        { value: "1", label: "Unsubscribed" },
        { value: "2", label: "Bounced" },
        { value: "3", label: "Manual" },
      ],
    },
    { key: "comments", label: "Comments", type: "string", default: "" },
  ],
  output: [
    { key: "channelId", type: "string", label: "Channel ID" },
    { key: "reason", type: "string", label: "Reason" },
    { key: "comments", type: "string", label: "Comments" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const id = Number(p.contactId);
    if (!Number.isFinite(id)) throw new Error("`contactId` must be a number");
    const channel = String(p.channel ?? "email").trim() || "email";
    // The host applies `default`, but a bare execute() call does not.
    const reason = p.reason === undefined ? "3" : String(p.reason);

    ctx.log("info", "adding a Mautic contact to Do Not Contact", { id, channel });

    return await new MauticClient(ctx).request(
      `/contacts/${id}/dnc/${encodeURIComponent(channel)}/add`,
      { method: "POST", body: compact({ reason, comments: p.comments }) },
    );
  },
};

export default action;
