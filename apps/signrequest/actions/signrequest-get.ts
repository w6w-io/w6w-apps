import type { ActionDefinition } from "@w6w/types";
import { SignRequestClient } from "../lib/client.ts";
import { signrequestIdParam, signrequestSummaryOutput } from "../lib/params.ts";

interface Input {
  signrequestId: string;
}

/** `GET /signrequests/{uuid}/` — a SignRequest's configuration and signer list. */
const signrequestGet: ActionDefinition<Input> = {
  key: "signrequest-get",
  type: "read",
  resource: "signrequest",
  title: "Get SignRequest",
  description: "Retrieve a SignRequest's configuration and signer list.",
  params: [signrequestIdParam],
  output: signrequestSummaryOutput,

  execute(input, ctx) {
    return new SignRequestClient(ctx).request(
      `/signrequests/${encodeURIComponent(input.signrequestId)}/`,
    );
  },
};

export default signrequestGet;
