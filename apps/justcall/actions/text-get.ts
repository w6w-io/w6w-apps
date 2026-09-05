import type { ActionDefinition } from "@w6w/types";
import { JustCallClient } from "../lib/client.ts";

/** `GET /v2.1/texts/{id}` — verified against `texts_get_v21`'s OpenAPI fragment, 2026-09-05. */
interface Input {
  id: string | number;
}

const textGet: ActionDefinition<Input> = {
  key: "text-get",
  type: "read",
  resource: "text",
  title: "Get Text",
  description: "Fetch data for an SMS: direction, associated agent number and delivery status.",
  params: [
    { key: "id", label: "SMS ID", type: "string", required: true },
  ],
  output: [
    { key: "id", type: "number", label: "SMS ID" },
    { key: "direction", type: "string", label: "Inbound or Outbound" },
    { key: "contact_number", type: "string", label: "Contact phone number" },
    { key: "justcall_number", type: "string", label: "JustCall number used" },
    { key: "delivery_status", type: "string", label: "Delivery status" },
    { key: "sms_info", type: "object", label: "Body and media" },
    { key: "sms_date", type: "string", label: "SMS date (UTC)" },
    { key: "sms_time", type: "string", label: "SMS time (UTC)" },
  ],

  async execute(input, ctx) {
    const client = new JustCallClient(ctx);
    return await client.data(`/texts/${encodeURIComponent(String(input.id))}`);
  },
};

export default textGet;
