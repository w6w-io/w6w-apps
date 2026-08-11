import type { ActionDefinition } from "@w6w/types";
import { AircallClient, encodeId } from "../lib/client.ts";
import { numberIdParam } from "../lib/params.ts";

interface Input {
  numberId: string;
}

/**
 * `GET /v1/numbers/:id` — one Number, with the Users assigned to it.
 *
 * Same two traps as List Numbers: `open` and `is_ivr` are documented as
 * deprecated and possibly stale for any Smartflows-enabled number. Read
 * `availability_status` instead.
 *
 * `digits` is the display format ("+33 1 76 11 11 11", with spaces) — the
 * unspaced E.164 form (`e164_digits`) is documented as appearing only in
 * webhook events, not in this API response, so do not expect to dial straight
 * from this field.
 */
const numberGet: ActionDefinition<Input> = {
  key: "number-get",
  type: "read",
  resource: "number",
  title: "Retrieve Number",
  description:
    "Fetch one phone Number with its assigned Users, recording setting and music/message URLs.",
  params: [numberIdParam],
  output: [
    { key: "id", type: "number", label: "Number ID" },
    { key: "name", type: "string", label: "Number name" },
    { key: "digits", type: "string", label: "Display format, with spaces — not E.164" },
    { key: "country", type: "string", label: "ISO 3166-1 alpha-2" },
    {
      key: "availability_status",
      type: "string",
      label: "open | custom | closed, from the first Time Rule widget",
    },
    { key: "live_recording_activated", type: "boolean", label: "Live recording enabled" },
    { key: "users", type: "array", label: "Users assigned to this Number" },
    { key: "messages", type: "object", label: "Music and message URLs" },
  ],

  async execute(input, ctx) {
    const client = new AircallClient(ctx);
    return await client.entity(`/numbers/${encodeId(input.numberId)}`, "number");
  },
};

export default numberGet;
