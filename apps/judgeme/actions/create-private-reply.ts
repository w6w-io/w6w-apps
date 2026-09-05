import type { ActionDefinition } from "@w6w/types";
import { compact, JudgeMeClient } from "../lib/client.ts";

/**
 * `POST /private_replies` — Email a reviewer privately, without publishing
 * anything on the storefront widget.
 *
 * Same undocumented-success-body shape as `create-reply`: the `200` response
 * has a description only, so this returns a plain confirmation.
 */
interface Input {
  reviewId: number;
  emailSubject: string;
  emailBody: string;
  sendPrivateEmail?: boolean;
}

const createPrivateReply: ActionDefinition<Input> = {
  key: "create-private-reply",
  type: "perform",
  resource: "reply",
  title: "Create Private Reply",
  description: "Email a reviewer privately about their review, without publishing a public reply.",
  idempotent: false,
  params: [
    { key: "reviewId", label: "Review ID", type: "number", required: true },
    { key: "emailSubject", label: "Email Subject", type: "string", required: true },
    { key: "emailBody", label: "Email Body", type: "text", required: true },
    {
      key: "sendPrivateEmail",
      label: "Send the Email",
      type: "boolean",
      default: true,
      advanced: true,
      hint: "Judge.me defaults this to true; set false to record the reply without emailing.",
    },
  ],
  output: [
    { key: "ok", type: "boolean", label: "Whether the private reply was created" },
  ],

  async execute(input, ctx) {
    await new JudgeMeClient(ctx).status("/private_replies", {
      method: "POST",
      body: compact({
        review_id: input.reviewId,
        send_private_email: input.sendPrivateEmail,
        private_reply: { email_subject: input.emailSubject, email_body: input.emailBody },
      }),
    });
    return { ok: true };
  },
};

export default createPrivateReply;
