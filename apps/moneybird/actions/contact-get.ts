import type { ActionDefinition } from "@w6w/types";
import { MoneybirdClient, resolveAdministrationId } from "../lib/client.ts";
import { administrationIdParam, idParam } from "../lib/params.ts";

interface Input {
  administrationId?: string;
  id: string;
}

/** `GET /:administration_id/contacts/:id.json` — full detail for one contact. */
const contactGet: ActionDefinition<Input> = {
  key: "contact-get",
  type: "read",
  resource: "contact",
  title: "Get Contact",
  description: "Retrieve one contact by its Moneybird id.",
  params: [administrationIdParam, idParam("Contact ID")],
  output: [
    { key: "id", type: "string", label: "Contact ID" },
    { key: "company_name", type: "string", label: "Company name" },
    { key: "email", type: "string", label: "Email" },
    { key: "customer_id", type: "string", label: "Customer ID" },
  ],

  execute(input, ctx) {
    const administrationId = resolveAdministrationId(ctx, input.administrationId);
    return new MoneybirdClient(ctx, administrationId).request(
      `/contacts/${encodeURIComponent(input.id)}`,
    );
  },
};

export default contactGet;
