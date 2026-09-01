import type { ActionDefinition } from "@w6w/types";
import { MessageBirdClient } from "../lib/client.ts";

interface Input {
  verifyId: string;
  token: string;
}

/**
 * Check a verification token the user typed back in:
 * `GET /verify/{verifyId}?token={token}`. Can only be done once for each
 * token — MessageBird invalidates it after one check, successful or not.
 * Verified against developers.messagebird.com/api/verify/#verify-a-token.
 */
const verifyCheck: ActionDefinition<Input> = {
  key: "verify-check",
  type: "perform",
  resource: "verify",
  title: "Check Verification Code",
  description: "Verify the one-time code a user entered against a Verify request.",
  idempotent: false,
  params: [
    {
      key: "verifyId",
      label: "Verify ID",
      type: "string",
      required: true,
      hint: "The `id` returned by Request Verification Code.",
    },
    { key: "token", label: "Code entered by the user", type: "string", required: true },
  ],
  output: [
    { key: "id", type: "string", label: "Verify ID" },
    { key: "recipient", type: "string", label: "Recipient" },
    { key: "status", type: "string", label: "Status" },
  ],

  execute(input, ctx) {
    const client = new MessageBirdClient(ctx);
    return client.request(`/verify/${encodeURIComponent(input.verifyId)}`, {
      query: { token: input.token },
    });
  },
};

export default verifyCheck;
