import type { ActionDefinition } from "@w6w/types";
import { compact, SignRequestClient } from "../lib/client.ts";
import { signrequestIdParam } from "../lib/params.ts";

interface Input {
  signrequestId: string;
  signerEmailToForward: string;
  signerEmailToForwardTo: string;
  forwardedReason?: string;
}

/**
 * `POST /signrequests/{uuid}/forward_signer/` — forward a SignRequest from one signer's email to a
 * different one. The optional reason is visible to all parties involved.
 */
const signrequestForwardSigner: ActionDefinition<Input> = {
  key: "signrequest-forward-signer",
  type: "perform",
  resource: "signrequest",
  title: "Forward SignRequest to Another Signer",
  description: "Forward a SignRequest from one signer's email to a different one.",
  idempotent: false,
  params: [
    signrequestIdParam,
    {
      key: "signerEmailToForward",
      label: "Signer's current email",
      type: "string",
      required: true,
    },
    {
      key: "signerEmailToForwardTo",
      label: "Forward to email",
      type: "string",
      required: true,
    },
    {
      key: "forwardedReason",
      label: "Reason",
      type: "text",
      hint: "Visible to all parties involved.",
    },
  ],
  output: [{ key: "status", type: "string", label: "Result" }],

  execute(input, ctx) {
    return new SignRequestClient(ctx).request(
      `/signrequests/${encodeURIComponent(input.signrequestId)}/forward_signer/`,
      {
        method: "POST",
        body: compact({
          signer_email_to_forward: input.signerEmailToForward,
          signer_email_to_forward_to: input.signerEmailToForwardTo,
          forwarded_reason: input.forwardedReason,
        }),
      },
    );
  },
};

export default signrequestForwardSigner;
