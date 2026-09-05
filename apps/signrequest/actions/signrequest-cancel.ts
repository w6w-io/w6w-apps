import type { ActionDefinition } from "@w6w/types";
import { SignRequestClient } from "../lib/client.ts";
import { signrequestIdParam, signrequestSummaryOutput } from "../lib/params.ts";

interface Input {
  signrequestId: string;
}

/**
 * `POST /signrequests/{uuid}/cancel_signrequest/` — cancel a SignRequest that has not been fully
 * signed or declined yet. Signers who have not signed lose the ability to open and sign it.
 */
const signrequestCancel: ActionDefinition<Input> = {
  key: "signrequest-cancel",
  type: "perform",
  resource: "signrequest",
  title: "Cancel SignRequest",
  description: "Cancel a SignRequest that has not been fully signed or declined yet.",
  idempotent: false,
  params: [signrequestIdParam],
  output: signrequestSummaryOutput,

  execute(input, ctx) {
    return new SignRequestClient(ctx).request(
      `/signrequests/${encodeURIComponent(input.signrequestId)}/cancel_signrequest/`,
      { method: "POST" },
    );
  },
};

export default signrequestCancel;
