import type { ActionDefinition } from "@w6w/types";
import { InstantlyClient, toList } from "../lib/client.ts";

/**
 * `POST /api/v2/accounts/pause` — pause up to 100 sending accounts in one
 * call. Each requested email lands in exactly one of `paused_emails` or
 * `failed_emails` — the vendor's own description notes `failed_emails`
 * covers both invalid addresses AND accounts whose status did not change
 * (e.g. already paused), so re-running with the same list is safe: an
 * already-paused account simply reports there again rather than erroring.
 */
interface Input {
  emails: string[] | string;
}

const accountPauseBulk: ActionDefinition<Input> = {
  key: "account-pause-bulk",
  type: "perform",
  resource: "account",
  title: "Pause Sending Accounts in Bulk",
  description: "Pause up to 100 sending accounts in one call.",
  idempotent: true,
  params: [
    {
      key: "emails",
      label: "Emails",
      type: "array",
      required: true,
      item: { type: "string", placeholder: "jondoe@example.com" },
      hint: "Up to 100. Duplicate values are ignored.",
    },
  ],
  output: [
    { key: "paused_emails", type: "array", label: "Successfully paused" },
    { key: "failed_emails", type: "array", label: "Invalid or unchanged" },
  ],

  execute(input, ctx) {
    return new InstantlyClient(ctx).json("/accounts/pause", {
      method: "POST",
      body: { emails: toList(input.emails) },
    });
  },
};

export default accountPauseBulk;
