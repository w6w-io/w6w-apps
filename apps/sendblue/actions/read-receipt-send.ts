import type { ActionDefinition } from "@w6w/types";
import { SendblueClient } from "../lib/client.ts";

interface Input {
  number: string;
  fromNumber: string;
}

/**
 * `POST /api/mark-read` — marks a conversation read (iMessage/RCS only, not
 * SMS). Best-effort with no delivery confirmation. The vendor's own docs note
 * read receipts must be enabled for the account by Sendblue's engineering
 * team on request; an account without it enabled should expect this to be a
 * no-op rather than an error.
 */
const readReceiptSend: ActionDefinition<Input> = {
  key: "read-receipt-send",
  type: "perform",
  resource: "read-receipt",
  title: "Send Read Receipt",
  description: "Mark a conversation as read (iMessage/RCS only). Requires read receipts to be " +
    "enabled for the account.",
  idempotent: true,
  params: [
    { key: "number", label: "Conversation number", type: "string", required: true },
    { key: "fromNumber", label: "From (Sendblue number)", type: "string", required: true },
  ],
  output: [
    { key: "status", type: "string", label: "Status" },
    { key: "number", type: "string", label: "Number" },
  ],

  execute(input, ctx) {
    const client = new SendblueClient(ctx);
    return client.post("/api/mark-read", { number: input.number, from_number: input.fromNumber });
  },
};

export default readReceiptSend;
