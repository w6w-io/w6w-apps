import type { ActionDefinition } from "@w6w/types";
import { BrazeClient } from "../lib/client.ts";

/**
 * `POST /users/identify` — verified against the fetched spec. Resolves an
 * anonymous/aliased user onto a known `external_id`, via one of
 * `aliases_to_identify`, `emails_to_identify`, or `phone_numbers_to_identify`.
 * Re-running the same identify call resolves the same merge again, which is a
 * no-op the second time — the operation is declarative rather than additive.
 */
const action: ActionDefinition = {
  key: "user-identify",
  type: "perform",
  resource: "user",
  title: "Identify User",
  description: "Resolve an alias, email, or phone number onto a known external ID.",
  idempotent: true,
  params: [
    {
      key: "aliasesToIdentify",
      label: "Aliases to Identify",
      type: "json",
      hint: "Array of { external_id, user_alias: { alias_name, alias_label } }.",
    },
    {
      key: "emailsToIdentify",
      label: "Emails to Identify",
      type: "json",
      hint: "Array of { external_id, email, prioritization? }.",
    },
    {
      key: "phoneNumbersToIdentify",
      label: "Phone Numbers to Identify",
      type: "json",
      hint: "Array of { external_id, phone, prioritization? }.",
    },
    {
      key: "mergeBehavior",
      label: "Merge Behavior",
      type: "select",
      options: [
        { value: "merge", label: "Merge" },
        { value: "none", label: "None" },
      ],
      default: "merge",
    },
  ],
  output: [
    { key: "message", type: "string", label: "Status" },
  ],

  async execute(input, ctx) {
    const p = input as {
      aliasesToIdentify?: unknown;
      emailsToIdentify?: unknown;
      phoneNumbersToIdentify?: unknown;
      mergeBehavior?: string;
    };
    ctx.log("info", "identifying Braze users");
    return await new BrazeClient(ctx).post("/users/identify", {
      aliases_to_identify: p.aliasesToIdentify ?? undefined,
      emails_to_identify: p.emailsToIdentify ?? undefined,
      phone_numbers_to_identify: p.phoneNumbersToIdentify ?? undefined,
      merge_behavior: p.mergeBehavior || undefined,
    });
  },
};

export default action;
