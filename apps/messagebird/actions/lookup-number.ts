import type { ActionDefinition } from "@w6w/types";
import { MessageBirdClient } from "../lib/client.ts";
import { toMsisdn } from "../lib/params.ts";

interface Input {
  phoneNumber: string;
  countryCode?: string;
}

/**
 * Resolve a phone number's country, line type, and canonical formats without
 * sending anything: `GET /lookup/{phoneNumber}`. Verified against
 * developers.messagebird.com/api/lookup/#request-a-lookup.
 */
const lookupNumber: ActionDefinition<Input> = {
  key: "lookup-number",
  type: "read",
  resource: "lookup",
  title: "Look Up Number",
  description: "Look up a phone number's country, line type, and formatted variants.",
  params: [
    {
      key: "phoneNumber",
      label: "Phone number",
      type: "string",
      required: true,
      hint: "E.164 format, e.g. +31612345678.",
    },
    {
      key: "countryCode",
      label: "Country code",
      type: "string",
      hint:
        "ISO 3166-1 alpha-2, e.g. NL. Required only if Phone number is in a national (non-E.164) format.",
    },
  ],
  output: [
    { key: "countryCode", type: "string", label: "Country code" },
    { key: "countryPrefix", type: "number", label: "Country calling code" },
    { key: "phoneNumber", type: "number", label: "Phone number" },
    { key: "type", type: "string", label: "Line type" },
    { key: "formats", type: "object", label: "Formatted variants" },
  ],

  execute(input, ctx) {
    const client = new MessageBirdClient(ctx);
    return client.request(`/lookup/${encodeURIComponent(toMsisdn(input.phoneNumber))}`, {
      query: { countryCode: input.countryCode },
    });
  },
};

export default lookupNumber;
