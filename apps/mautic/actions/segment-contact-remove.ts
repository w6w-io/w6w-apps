import type { ActionDefinition } from "@w6w/types";
import { MauticClient } from "../lib/client.ts";
import { CONTACT_ID_PARAM, SEGMENT_ID_PARAM } from "../lib/params.ts";

/**
 * `POST /segments/{segmentId}/contact/{contactId}/remove` — verified against
 * Mautic's REST API docs (`segments.html`, "Remove Contact from Segment").
 */
const action: ActionDefinition = {
  key: "segment-contact-remove",
  type: "perform",
  resource: "segment",
  title: "Remove a contact from a segment",
  description: "Remove a contact from a segment.",
  idempotent: true,
  params: [SEGMENT_ID_PARAM, CONTACT_ID_PARAM],
  output: [{ key: "success", type: "number", label: "1 on success" }],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const segmentId = Number(p.segmentId);
    const contactId = Number(p.contactId);
    if (!Number.isFinite(segmentId)) throw new Error("`segmentId` must be a number");
    if (!Number.isFinite(contactId)) throw new Error("`contactId` must be a number");

    ctx.log("info", "removing a contact from a Mautic segment", { segmentId, contactId });

    return await new MauticClient(ctx).request(
      `/segments/${segmentId}/contact/${contactId}/remove`,
      { method: "POST" },
    );
  },
};

export default action;
