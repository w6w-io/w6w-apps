import type { ActionDefinition } from "@w6w/types";
import { SignRequestClient } from "../lib/client.ts";
import { signrequestIdParam } from "../lib/params.ts";

interface Input {
  signrequestId: string;
}

/**
 * `POST /signrequests/{uuid}/resend_signrequest_email/` — resend the SignRequest email as a
 * reminder to every signer who received it but has not signed yet.
 */
const signrequestResendEmail: ActionDefinition<Input> = {
  key: "signrequest-resend-email",
  type: "perform",
  resource: "signrequest",
  title: "Resend SignRequest Email",
  description: "Resend the SignRequest email as a reminder to signers who haven't signed yet.",
  idempotent: false,
  params: [signrequestIdParam],
  output: [{ key: "status", type: "string", label: "Result" }],

  execute(input, ctx) {
    return new SignRequestClient(ctx).request(
      `/signrequests/${encodeURIComponent(input.signrequestId)}/resend_signrequest_email/`,
      { method: "POST" },
    );
  },
};

export default signrequestResendEmail;
