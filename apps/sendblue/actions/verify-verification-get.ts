import type { ActionDefinition } from "@w6w/types";
import { SendblueClient } from "../lib/client.ts";

interface Input {
  serviceSid: string;
  verificationSid: string;
}

/**
 * `GET /api/v2/verify/services/{service_sid}/verifications/{verification_sid}`
 * — poll this for the authoritative status (`pending` / `approved` /
 * `expired` / `canceled`). See `verify-verification-create.ts` for why there
 * is no separate "submit the code" call to make instead.
 */
const verifyVerificationGet: ActionDefinition<Input> = {
  key: "verify-verification-get",
  type: "read",
  resource: "verification",
  title: "Get Verification Status",
  description: "Poll one Verification's authoritative status.",
  params: [
    { key: "serviceSid", label: "Verify Service SID", type: "string", required: true },
    { key: "verificationSid", label: "Verification SID", type: "string", required: true },
  ],
  output: [
    { key: "sid", type: "string", label: "Verification SID" },
    { key: "status", type: "string", label: "Status" },
  ],

  execute(input, ctx) {
    const client = new SendblueClient(ctx);
    return client.get(
      `/api/v2/verify/services/${encodeURIComponent(input.serviceSid)}/verifications/` +
        encodeURIComponent(input.verificationSid),
    );
  },
};

export default verifyVerificationGet;
