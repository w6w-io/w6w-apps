import type { ActionDefinition } from "@w6w/types";
import { NeverBounceClient } from "../lib/client.ts";

interface Input {
  email: string;
  addressInfo?: boolean;
  creditsInfo?: boolean;
  timeout?: number;
}

/**
 * `GET /single/check` — verify a single email address synchronously.
 * Source: the OAS `operationId: single-check` embedded in
 * `https://developers.neverbounce.com/reference/single-check`.
 *
 * `address_info`/`credits_info` are documented as `integer` (0/1) query flags
 * rather than real booleans, so this action's boolean params are converted at
 * the call site. `result` is one of `valid`, `invalid`, `disposable`,
 * `catchall`, or `unknown` per the vendor's own result-code reference.
 */
const singleCheck: ActionDefinition<Input> = {
  key: "single-check",
  type: "read",
  resource: "email",
  title: "Verify Email",
  description: "Check a single email address's deliverability.",
  params: [
    {
      key: "email",
      label: "Email",
      type: "string",
      required: true,
      placeholder: "name@example.com",
      hint: "The address to verify. Encoded automatically — no need to percent-encode @.",
    },
    {
      key: "addressInfo",
      label: "Include Address Info",
      type: "boolean",
      default: false,
      hint: "Break the address down into local part, domain, TLD, etc.",
      advanced: true,
    },
    {
      key: "creditsInfo",
      label: "Include Credits Info",
      type: "boolean",
      default: false,
      hint: "Include the account's remaining credit balance in the response.",
      advanced: true,
    },
    {
      key: "timeout",
      label: "Timeout (seconds)",
      type: "number",
      hint: "The maximum time NeverBounce should spend trying to verify the address.",
      advanced: true,
    },
  ],
  output: [
    {
      key: "result",
      type: "string",
      label: "Result (valid, invalid, disposable, catchall, unknown)",
    },
    { key: "flags", type: "array", label: "Diagnostic flags (e.g. has_dns, smtp_connectable)" },
    { key: "suggested_correction", type: "string", label: "Suggested correction, if any" },
    { key: "address_info", type: "object", label: "Address breakdown, when requested" },
    { key: "credits_info", type: "object", label: "Account credit balance, when requested" },
    { key: "execution_time", type: "number", label: "Server-side execution time, in ms" },
  ],

  execute(input, ctx) {
    const client = new NeverBounceClient(ctx);
    return client.request("/single/check", {
      query: {
        email: input.email,
        address_info: input.addressInfo ? 1 : undefined,
        credits_info: input.creditsInfo ? 1 : undefined,
        timeout: input.timeout,
      },
    });
  },
};

export default singleCheck;
