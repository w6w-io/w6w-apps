import type { ActionDefinition } from "@w6w/types";
import { compact, csv, MauticClient } from "../lib/client.ts";
import { EMAIL_ID_PARAM } from "../lib/params.ts";

/**
 * `POST /emails/{id}/send` — verified against Mautic's REST API docs
 * (`emails.html`, "Send Email to Segment"). Sends to the contacts in the
 * email's own assigned segments unless `segmentIds` overrides them — passing
 * segment ids here does not change which segments the email is assigned to,
 * only who this particular call targets.
 */
const action: ActionDefinition = {
  key: "email-send-to-segment",
  type: "perform",
  resource: "email",
  title: "Send an email to its segments",
  description:
    "Send an email to the contacts in its assigned segments, or to specific segment IDs.",
  idempotent: false,
  params: [
    EMAIL_ID_PARAM,
    {
      key: "segmentIds",
      label: "Segment IDs",
      type: "string",
      default: "",
      hint: "Comma-separated segment IDs. Overrides the email's own assigned segments for this " +
        "send only. Leave blank to use the email's assigned segments.",
    },
  ],
  output: [
    { key: "success", type: "boolean", label: "Success" },
    { key: "sentCount", type: "number", label: "Sent" },
    { key: "failedRecipients", type: "number", label: "Failed" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const emailId = Number(p.emailId);
    if (!Number.isFinite(emailId)) throw new Error("`emailId` must be a number");

    const segmentIds = csv(p.segmentIds)?.map((id) => {
      const n = Number(id);
      if (!Number.isFinite(n)) throw new Error(`segment id "${id}" is not numeric`);
      return n;
    });

    ctx.log("info", "sending a Mautic email to segments", { emailId, segmentIds });

    return await new MauticClient(ctx).request(`/emails/${emailId}/send`, {
      method: "POST",
      body: compact({ listIds: segmentIds }),
    });
  },
};

export default action;
