import type { ActionDefinition } from "@w6w/types";
import { MauticClient } from "../lib/client.ts";
import { CONTACT_ID_PARAM, SEGMENT_ID_PARAM } from "../lib/params.ts";

/**
 * `POST /segments/{segmentId}/contact/{contactId}/add` — verified against
 * Mautic's REST API docs (`segments.html`, "Add Contact to Segment"). Manual
 * membership like this survives even if the contact stops matching the
 * segment's own filters — Mautic tracks `manuallyAdded` separately.
 */
const action: ActionDefinition = {
  key: "segment-contact-add",
  type: "perform",
  resource: "segment",
  title: "Add a contact to a segment",
  description: "Manually add a contact to a segment.",
  idempotent: true,
  params: [SEGMENT_ID_PARAM, CONTACT_ID_PARAM],
  output: [{ key: "success", type: "number", label: "1 on success" }],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const segmentId = Number(p.segmentId);
    const contactId = Number(p.contactId);
    if (!Number.isFinite(segmentId)) throw new Error("`segmentId` must be a number");
    if (!Number.isFinite(contactId)) throw new Error("`contactId` must be a number");

    ctx.log("info", "adding a contact to a Mautic segment", { segmentId, contactId });

    return await new MauticClient(ctx).request(
      `/segments/${segmentId}/contact/${contactId}/add`,
      { method: "POST" },
    );
  },
};

export default action;
