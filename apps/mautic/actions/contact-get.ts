import type { ActionDefinition } from "@w6w/types";
import { MauticClient } from "../lib/client.ts";
import { CONTACT_ID_PARAM } from "../lib/params.ts";

/**
 * `GET /contacts/{id}` — verified against Mautic's REST API docs
 * (`devdocs.mautic.org/en/7.1/rest_api/contacts.html`, "Get Contact").
 */
const action: ActionDefinition = {
  key: "contact-get",
  type: "read",
  resource: "contact",
  title: "Get a contact",
  description: "Retrieve a single contact by ID.",
  params: [CONTACT_ID_PARAM],
  output: [
    { key: "id", type: "number", label: "ID" },
    { key: "points", type: "number", label: "Lead score" },
    { key: "fields", type: "object", label: "Field values, grouped" },
    { key: "tags", type: "array", label: "Tags" },
    { key: "doNotContact", type: "array", label: "Do Not Contact entries" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const id = Number(p.contactId);
    if (!Number.isFinite(id)) throw new Error("`contactId` must be a number");

    ctx.log("info", "getting a Mautic contact", { id });

    const body = await new MauticClient(ctx).request<{ contact: unknown }>(`/contacts/${id}`);
    return body.contact;
  },
};

export default action;
