import type { ActionDefinition } from "@w6w/types";
import { WatiClient } from "../lib/client.ts";
import { CONTACT_TARGET_PARAM } from "../lib/params.ts";

interface Input {
  target: string;
}

interface ContactDto {
  id?: string;
  wa_id?: string;
  name?: string;
  phone?: string;
  contact_status?: string;
  opted_in?: boolean;
  allow_broadcast?: boolean;
  teams?: string[];
  segments?: string[];
  custom_params?: Array<{ name: string; value: string }>;
}

/**
 * `GET /api/ext/v3/contacts/{target}` — verified against the embedded OpenAPI document
 * 2026-09-05. `target` accepts a ContactId, a PhoneNumber, or `Channel:PhoneNumber`.
 */
const action: ActionDefinition<Input, ContactDto> = {
  key: "contact-get",
  type: "read",
  resource: "contacts",
  title: "Get Contact",
  description: "Get one contact's full details.",
  params: [CONTACT_TARGET_PARAM],
  output: [
    { key: "id", label: "Contact ID", type: "string" },
    { key: "name", label: "Name", type: "string" },
    { key: "phone", label: "Phone", type: "string" },
    { key: "contact_status", label: "Status", type: "string" },
  ],

  async execute(input, ctx) {
    ctx.log("info", "getting Wati contact", { target: input.target });
    return await new WatiClient(ctx).get<ContactDto>(
      `/contacts/${encodeURIComponent(input.target)}`,
    );
  },
};

export default action;
