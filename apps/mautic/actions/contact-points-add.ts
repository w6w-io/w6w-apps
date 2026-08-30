import type { ActionDefinition } from "@w6w/types";
import { compact, MauticClient } from "../lib/client.ts";
import { CONTACT_ID_PARAM } from "../lib/params.ts";

/**
 * `POST /contacts/{id}/points/plus/{points}` — verified against Mautic's REST
 * API docs (`contacts.html`, "Add Points"). Returns a 404 if the contact does
 * not exist.
 */
const action: ActionDefinition = {
  key: "contact-points-add",
  type: "perform",
  resource: "contact",
  title: "Add points to a contact",
  description: "Increase a contact's lead score by a fixed amount.",
  // Calling this twice adds the delta twice — it is not a "set" operation.
  idempotent: false,
  params: [
    CONTACT_ID_PARAM,
    { key: "points", label: "Points", type: "number", required: true, default: 1 },
    { key: "eventName", label: "Event Name", type: "string", default: "" },
    { key: "actionName", label: "Action Name", type: "string", default: "" },
  ],
  output: [{ key: "success", type: "boolean", label: "Success" }],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const id = Number(p.contactId);
    const points = Number(p.points);
    if (!Number.isFinite(id)) throw new Error("`contactId` must be a number");
    if (!Number.isFinite(points)) throw new Error("`points` must be a number");

    ctx.log("info", "adding points to a Mautic contact", { id, points });

    return await new MauticClient(ctx).request(`/contacts/${id}/points/plus/${points}`, {
      method: "POST",
      body: compact({ eventName: p.eventName, actionName: p.actionName }),
    });
  },
};

export default action;
