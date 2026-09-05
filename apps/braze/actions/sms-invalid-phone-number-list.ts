import type { ActionDefinition } from "@w6w/types";
import { BrazeClient } from "../lib/client.ts";

/**
 * `GET /sms/invalid_phone_numbers` — verified against the fetched spec. Its
 * `parameters` block mistypes `phone_numbers` as an integer; the endpoint's
 * own prose and example request (`phone_numbers[]=...`) are unambiguous that
 * it is an array of E.164 phone numbers, so that is what this action sends.
 * Braze requires either a date range OR `phoneNumbers` — if both are given,
 * the phone numbers win and the date range is ignored.
 */
const action: ActionDefinition = {
  key: "sms-invalid-phone-number-list",
  type: "read",
  resource: "sms",
  title: "List Invalid Phone Numbers",
  description: "Query phone numbers Braze has found undeliverable, by date range or explicit list.",
  params: [
    { key: "startDate", label: "Start Date", type: "date", hint: "YYYY-MM-DD, UTC midnight." },
    { key: "endDate", label: "End Date", type: "date", hint: "YYYY-MM-DD, UTC midnight." },
    { key: "limit", label: "Limit", type: "number", default: 100, hint: "Max 500." },
    { key: "offset", label: "Offset", type: "number", default: 0 },
    {
      key: "phoneNumbers",
      label: "Phone Numbers",
      type: "array",
      item: { type: "string", placeholder: "+12345678901" },
      hint: "E.164 format. Overrides the date range if both are given.",
    },
    {
      key: "reason",
      label: "Reason",
      type: "select",
      options: [
        { value: "provider_error", label: "Provider error" },
        { value: "deactivated", label: "Deactivated" },
      ],
    },
  ],
  output: [
    { key: "invalidPhoneNumbers", type: "array", label: "Invalid Phone Numbers" },
  ],

  async execute(input, ctx) {
    const p = input as {
      startDate?: string;
      endDate?: string;
      limit?: number;
      offset?: number;
      phoneNumbers?: string[];
      reason?: string;
    };
    return await new BrazeClient(ctx).get("/sms/invalid_phone_numbers", {
      start_date: p.startDate || undefined,
      end_date: p.endDate || undefined,
      limit: p.limit,
      offset: p.offset,
      phone_numbers: p.phoneNumbers?.length ? p.phoneNumbers : undefined,
      reason: p.reason || undefined,
    });
  },
};

export default action;
