import type { ActionDefinition } from "@w6w/types";
import { encodeId, KeapClient, V2 } from "../lib/client.ts";
import { emailStatusValues } from "../lib/params.ts";

/**
 * `GET /rest/v2/emailAddresses/{email}/status` — marketability of one address.
 *
 * The check to run *before* a campaign, not after. Keap distinguishes 17
 * opt-in states and `opted_in` collapses them to a boolean — but the states
 * that matter operationally are not symmetrical: `HARD_BOUNCE`, `SPAM`,
 * `INVALID`, `LOCKDOWN` and `LIST_UNSUBSCRIBE` are permanent or
 * complaint-driven, while `UNENGAGED_MARKETABLE` and `SINGLE_OPT_IN` are
 * perfectly sendable. The full `status` is returned alongside the boolean for
 * that reason.
 *
 * The address goes in the **path**, so it is percent-encoded — an unescaped
 * `+` in an address (the common Gmail tag form) otherwise decodes to a space
 * and 404s.
 */
interface Input {
  email: string;
}

const emailStatusGet: ActionDefinition<Input> = {
  key: "email-status-get",
  type: "read",
  title: "Get Email Address Status",
  resource: "email",
  description: "Read one email address's opt-in status and last open, click and send times.",
  params: [
    {
      key: "email",
      label: "Email address",
      type: "string",
      required: true,
      hint: "Encoded for you, so a plus-addressed form works as typed.",
    },
  ],
  output: [
    { key: "email", type: "string", label: "Email address" },
    { key: "opted_in", type: "boolean", label: "Marketable" },
    { key: "status", type: "string", label: `Opt-in status (one of ${emailStatusValues.length})` },
    { key: "last_open_time", type: "string", label: "Last open" },
    { key: "last_click_time", type: "string", label: "Last click" },
  ],

  execute(input, ctx) {
    const client = new KeapClient(ctx);
    return client.json(`${V2}/emailAddresses/${encodeId(input.email)}/status`);
  },
};

export default emailStatusGet;
