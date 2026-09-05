import type { ActionDefinition } from "@w6w/types";
import { compact, JustCallClient } from "../lib/client.ts";

/**
 * `POST /v2.1/texts/checkreply` — verified against `texts_checkreply_v21`'s
 * OpenAPI fragment, 2026-09-05.
 *
 * A `POST` with no side effect: it returns the most recent inbound SMS from a
 * contact, so it is modeled as a `read` rather than a `perform` despite the
 * verb.
 */
interface Input {
  contact_number: string;
  justcall_number?: string;
}

const textCheckReply: ActionDefinition<Input> = {
  key: "text-check-reply",
  type: "read",
  resource: "text",
  title: "Check Reply",
  description:
    "Check for the most recent inbound SMS from a contact, optionally scoped to a specific " +
    "JustCall number.",
  params: [
    { key: "contact_number", label: "Contact number", type: "string", required: true },
    { key: "justcall_number", label: "JustCall number", type: "string" },
  ],
  output: [
    { key: "id", type: "number", label: "SMS ID" },
    { key: "direction", type: "string", label: "Inbound" },
    { key: "sms_info", type: "object", label: "Body and media" },
    { key: "sms_date", type: "string", label: "SMS date (UTC)" },
    { key: "sms_time", type: "string", label: "SMS time (UTC)" },
  ],

  async execute(input, ctx) {
    const client = new JustCallClient(ctx);
    return await client.data("/texts/checkreply", {
      method: "POST",
      body: compact({
        contact_number: input.contact_number,
        justcall_number: input.justcall_number,
      }),
    });
  },
};

export default textCheckReply;
