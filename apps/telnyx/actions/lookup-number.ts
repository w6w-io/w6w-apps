import type { ActionDefinition } from "@w6w/types";
import { TelnyxClient } from "../lib/client.ts";

interface Input {
  phoneNumber: string;
  type?: "carrier" | "caller-name";
}

/**
 * `GET /number_lookup/{phone_number}` — carrier and line-type data by
 * default, or CNAM caller-name data when `type` is `caller-name`.
 *
 * Caller-name lookups are billed separately from carrier lookups and require
 * Caller ID Name to be enabled on the account — a working key that has never
 * enabled it will get a Telnyx error on that `type` alone, not on a plain
 * carrier lookup, which works on any account.
 */
const lookupNumber: ActionDefinition<Input> = {
  key: "lookup-number",
  type: "read",
  resource: "number",
  title: "Look Up Number",
  description: "Look up carrier and line-type information, or caller name, for a phone number.",
  params: [
    {
      key: "phoneNumber",
      label: "Phone number",
      type: "string",
      required: true,
      hint: "E.164 format, e.g. +18665552368.",
    },
    {
      key: "type",
      label: "Lookup type",
      type: "select",
      options: [
        { label: "Carrier", value: "carrier" },
        { label: "Caller name (CNAM)", value: "caller-name" },
      ],
      default: "carrier",
      hint:
        "Caller name lookups are billed separately and require Caller ID Name enabled on the account.",
    },
  ],
  output: [{ key: "data", type: "object", label: "The lookup record" }],

  execute(input, ctx) {
    return new TelnyxClient(ctx).data(
      `/number_lookup/${encodeURIComponent(input.phoneNumber)}`,
      { query: { type: input.type ?? "carrier" } },
    );
  },
};

export default lookupNumber;
