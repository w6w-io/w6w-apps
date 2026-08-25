import type { ActionDefinition } from "@w6w/types";
import { SendblueClient } from "../lib/client.ts";

interface Input {
  serviceSid: string;
  to: string;
}

/**
 * `POST /api/v2/verify/services/{service_sid}/verifications` — Sendblue
 * Verify is an INVERTED OTP, and this is the single most important thing to
 * know before using it: unlike Twilio Verify (send a code, the user types it
 * into your app, you POST it back to a `.../checks` endpoint), Sendblue asks
 * the user to TEXT the returned `delivery_target.code` FROM their own phone
 * TO the returned `delivery_target.pool_number`. Verification happens
 * automatically, server-side, the moment that inbound text arrives from the
 * expected number — there is no "submit the code" endpoint to call, and
 * confirmed live in the docs: no `.../verifications/.../check` path exists
 * anywhere in this API. A caller who builds a code-input form expecting to
 * POST it somewhere will find nothing to POST it to; the correct integration
 * is to poll (or webhook-listen for) `verify-verification-get`/`-list` until
 * `status` becomes `approved`, `expired`, or `canceled`.
 *
 * The `hosted` widget-session option (an embeddable, origin-bound iframe) is
 * deliberately NOT exposed as a param here: its response includes a
 * one-session bearer token baked into a URL fragment that the vendor's own
 * docs say must never be logged or persisted, which does not fit a workflow
 * step whose output is stored and displayed. Use the plain `to` flow instead.
 */
const verifyVerificationCreate: ActionDefinition<Input> = {
  key: "verify-verification-create",
  type: "perform",
  resource: "verification",
  title: "Create Verification",
  description: "Start an inverted-OTP verification: the recipient must TEXT the returned code " +
    'back to Sendblue — there is no separate "check code" call.',
  idempotent: false,
  params: [
    { key: "serviceSid", label: "Verify Service SID", type: "string", required: true },
    { key: "to", label: "Phone number to verify", type: "string", required: true },
  ],
  output: [
    { key: "sid", type: "string", label: "Verification SID" },
    { key: "status", type: "string", label: "Status" },
    { key: "delivery_target", type: "object", label: "Code + number the recipient must text" },
  ],

  execute(input, ctx) {
    const client = new SendblueClient(ctx);
    return client.post(
      `/api/v2/verify/services/${encodeURIComponent(input.serviceSid)}/verifications`,
      { to: input.to },
    );
  },
};

export default verifyVerificationCreate;
