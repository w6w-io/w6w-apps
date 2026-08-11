import type { ActionDefinition } from "@w6w/types";
import { encodeSegment, PodioClient } from "../lib/client.ts";

/**
 * `POST /hook/{hook_id}/verify/request` — "Request the hook to be validated.
 * This will cause the hook to send a request to the URL with the parameter
 * `type` set to `hook.verify` and `code` set to the verification code. The
 * endpoint must then call the validate method with the code to complete the
 * verification."
 *
 * Step 2 of the three-step activation described on Create Webhook. It triggers
 * Podio to call *your* endpoint; the code lands there and never here, which is
 * why the third step is not an action in this app.
 *
 * Idempotent: re-requesting verification simply sends another code. Running it
 * twice is how you recover when the first callback was lost, so retrying it is
 * exactly the right behaviour.
 *
 * The endpoint returns no body; this action reports the HTTP status.
 */
interface Input {
  hookId: string;
}

const hookVerifyRequest: ActionDefinition<Input> = {
  key: "hook-verify-request",
  type: "perform",
  resource: "webhook",
  title: "Request Webhook Verification",
  description:
    "Ask Podio to send the verification code to a webhook's URL. Your endpoint must then " +
    "POST that code back to Podio's validate endpoint to activate the hook.",
  idempotent: true,
  params: [
    {
      key: "hookId",
      label: "Hook ID",
      type: "string",
      required: true,
      hint: "From Create Webhook or List Webhooks.",
    },
  ],
  output: [{ key: "status", type: "number", label: "HTTP status" }],

  async execute(input, ctx) {
    const status = await new PodioClient(ctx).status(
      `/hook/${encodeSegment(input.hookId)}/verify/request`,
      { method: "POST" },
    );
    return { status };
  },
};

export default hookVerifyRequest;
