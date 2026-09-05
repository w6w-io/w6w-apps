import type { ActionDefinition } from "@w6w/types";
import { JustCallClient } from "../lib/client.ts";

/**
 * `GET /v2.1/phone-numbers/{id}` — verified against `phone_number_get_v21`'s
 * OpenAPI fragment, 2026-09-05. Doubles as an availability check: the
 * response's `current_status` field reflects the number's status at the
 * moment of the call.
 */
interface Input {
  id: string | number;
}

const phoneNumberGet: ActionDefinition<Input> = {
  key: "phone-number-get",
  type: "read",
  resource: "phone-number",
  title: "Get Phone Number",
  description: "Fetch data for a phone number, including its current availability status.",
  params: [
    { key: "id", label: "Phone number ID", type: "string", required: true },
  ],
  output: [
    { key: "id", type: "number", label: "Phone number ID" },
    { key: "justcall_number", type: "string", label: "JustCall number" },
    { key: "friendly_number", type: "string", label: "Friendly-formatted number" },
    { key: "justcall_line_name", type: "string", label: "Line name" },
    { key: "number_type", type: "string", label: "local, mobile, toll_free, etc." },
    { key: "current_status", type: "string", label: "Availability at the time of the call" },
    { key: "availability_setting", type: "string", label: "Always Open / Closed / Custom Hours" },
    { key: "capabilities", type: "object", label: "call / sms / mms support" },
    { key: "number_owner", type: "object", label: "Assigned owner" },
    { key: "business_registration", type: "string", label: "Draft/In Review/Approved/Failed/N-A" },
  ],

  async execute(input, ctx) {
    const client = new JustCallClient(ctx);
    return await client.data(`/phone-numbers/${encodeURIComponent(String(input.id))}`);
  },
};

export default phoneNumberGet;
