import type { ActionDefinition } from "@w6w/types";
import { REGION_OPTIONS, ZeroBounceClient } from "../lib/client.ts";

interface Input {
  startDate: string;
  endDate: string;
  region?: string;
}

/**
 * `GET /v2/getapiusage` — usage statistics for a date range: total calls
 * made, plus a per-status breakdown (`status_valid`, `status_invalid`,
 * `status_catch_all`, `status_do_not_mail`, `status_spamtrap`, and every
 * other value/sub-status this app's `validate-email`/`validate-batch`
 * actions can return — over 30 fields observed in the vendor's own docs).
 * Source: `https://www.zerobounce.net/docs/email-validation-api-quickstart`.
 *
 * `start_date`/`end_date` are documented as `yyyy-mm-dd` and required — no
 * default range is documented, so this app leaves them required rather than
 * guessing one.
 *
 * Only the small set of fields the docs discuss by name are declared in
 * `output` below; the response verbatim carries many more `status_*`
 * breakdown fields than are worth enumerating individually here.
 */
const getApiUsage: ActionDefinition<Input> = {
  key: "get-api-usage",
  type: "read",
  resource: "account",
  title: "Get API Usage",
  description: "Read call-volume and result-status statistics for a date range.",
  params: [
    {
      key: "startDate",
      label: "Start Date",
      type: "string",
      required: true,
      placeholder: "2026-01-01",
      hint: "Format: yyyy-mm-dd.",
    },
    {
      key: "endDate",
      label: "End Date",
      type: "string",
      required: true,
      placeholder: "2026-12-31",
      hint: "Format: yyyy-mm-dd.",
    },
    {
      key: "region",
      label: "Region",
      type: "select",
      default: "default",
      options: REGION_OPTIONS,
      advanced: true,
    },
  ],
  output: [
    { key: "total", type: "number", label: "Total API calls in the period" },
    { key: "status_valid", type: "number", label: "Valid results" },
    { key: "status_invalid", type: "number", label: "Invalid results" },
    { key: "status_catch_all", type: "number", label: "Catch-all results" },
    { key: "status_unknown", type: "number", label: "Unknown results" },
    { key: "status_do_not_mail", type: "number", label: "Do-not-mail results" },
    { key: "status_spamtrap", type: "number", label: "Spamtrap results" },
    { key: "status_abuse", type: "number", label: "Abuse results" },
  ],

  execute(input, ctx) {
    const client = new ZeroBounceClient(ctx);
    return client.request("/v2/getapiusage", {
      region: input.region,
      query: { start_date: input.startDate, end_date: input.endDate },
    });
  },
};

export default getApiUsage;
