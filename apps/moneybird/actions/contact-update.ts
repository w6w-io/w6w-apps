import type { ActionDefinition } from "@w6w/types";
import { compact, MoneybirdClient, resolveAdministrationId } from "../lib/client.ts";
import {
  administrationIdParam,
  contactBody,
  type ContactFieldInput,
  contactFieldParams,
  idParam,
} from "../lib/params.ts";

interface Input extends ContactFieldInput {
  administrationId?: string;
  id: string;
}

/** `PATCH /:administration_id/contacts/:id.json` — partial update, same body shape as create. */
const contactUpdate: ActionDefinition<Input> = {
  key: "contact-update",
  type: "perform",
  resource: "contact",
  title: "Update Contact",
  description: "Update fields on an existing contact. Only the fields provided are changed.",
  idempotent: true,
  params: [administrationIdParam, idParam("Contact ID"), ...contactFieldParams()],
  output: [
    { key: "id", type: "string", label: "Contact ID" },
    { key: "customer_id", type: "string", label: "Customer ID" },
  ],

  execute(input, ctx) {
    const administrationId = resolveAdministrationId(ctx, input.administrationId);
    return new MoneybirdClient(ctx, administrationId).request(
      `/contacts/${encodeURIComponent(input.id)}`,
      { method: "PATCH", body: { contact: compact(contactBody(input)) } },
    );
  },
};

export default contactUpdate;
