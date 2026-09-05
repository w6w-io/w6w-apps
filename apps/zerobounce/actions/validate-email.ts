import type { ActionDefinition } from "@w6w/types";
import { REGION_OPTIONS, ZeroBounceClient } from "../lib/client.ts";

interface Input {
  email: string;
  ipAddress?: string;
  region?: string;
}

/**
 * `GET /v2/validate` — validate a single email address synchronously.
 * Source: the vendor's Postman collection embedded in
 * `https://www.zerobounce.net/docs/email-validation-api-quickstart`
 * (`"name": "Validate Emails"`, `GET /v2/validate?api_key=...&email=...&ip_address=...`).
 *
 * `ip_address` is a required URL parameter per that same collection, but
 * documented as "(Can be blank, but parameter required)" — this app treats
 * it as optional and simply omits it when unset, which the vendor's own
 * examples do too (a trailing `&ip_address=`).
 *
 * The docs state this endpoint "can be called asynchronously and is not
 * currently rate-limited" and "will never consume a credit for any unknown
 * result".
 */
const validateEmail: ActionDefinition<Input> = {
  key: "validate-email",
  type: "read",
  resource: "email",
  title: "Validate Email",
  description: "Check a single email address's deliverability and identify risky addresses.",
  params: [
    {
      key: "email",
      label: "Email",
      type: "string",
      required: true,
      placeholder: "name@example.com",
      hint: "The address to validate.",
    },
    {
      key: "ipAddress",
      label: "IP Address",
      type: "string",
      hint: "The IP address the email signed up from, if known. Improves the result for some " +
        "domains. Leave blank if unknown.",
      advanced: true,
    },
    {
      key: "region",
      label: "Region",
      type: "select",
      default: "default",
      options: REGION_OPTIONS,
      hint: "Pin the request to a specific data-residency region. Leave as Default unless your " +
        "account requires US- or EU-only processing.",
      advanced: true,
    },
  ],
  output: [
    { key: "address", type: "string", label: "Email address" },
    {
      key: "status",
      type: "string",
      label: "Status (valid, invalid, catch-all, unknown, spamtrap, abuse, do_not_mail)",
    },
    { key: "sub_status", type: "string", label: "Sub-status detail" },
    { key: "free_email", type: "boolean", label: "Free email provider" },
    { key: "did_you_mean", type: "string", label: "Suggested correction, if any" },
    { key: "account", type: "string", label: "Mailbox part of the address" },
    { key: "domain", type: "string", label: "Domain part of the address" },
    { key: "domain_age_days", type: "string", label: "Domain age, in days" },
    { key: "smtp_provider", type: "string", label: "Detected mail provider" },
    { key: "mx_found", type: "string", label: "Whether an MX record was found" },
    { key: "mx_record", type: "string", label: "MX record" },
    { key: "catchall_domain", type: "boolean", label: "Domain accepts all mail (catch-all)" },
    { key: "firstname", type: "string", label: "Best-effort first name" },
    { key: "lastname", type: "string", label: "Best-effort last name" },
    { key: "gender", type: "string", label: "Best-effort gender" },
    { key: "country", type: "string", label: "Country, when derived from ip_address" },
    { key: "region", type: "string", label: "Region, when derived from ip_address" },
    { key: "city", type: "string", label: "City, when derived from ip_address" },
    { key: "zipcode", type: "string", label: "Zip code, when derived from ip_address" },
    { key: "processed_at", type: "string", label: "Timestamp the validation was processed" },
  ],

  execute(input, ctx) {
    const client = new ZeroBounceClient(ctx);
    return client.request("/v2/validate", {
      region: input.region,
      query: { email: input.email, ip_address: input.ipAddress ?? "" },
    });
  },
};

export default validateEmail;
