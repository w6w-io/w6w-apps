import type { ActionDefinition } from "@w6w/types";
import { encodeId, HarvestClient } from "../lib/client.ts";

/**
 * `POST /v3/applications/{id}/reject` — reject an application and record why.
 *
 * `rejection_reason_id` is required and Greenhouse will not pick one: resolve it
 * first with `list-rejection-reasons`, and store the id rather than the name —
 * customers rename reasons, ids are stable.
 *
 * ## The rejection e-mail is opt-in, and can be scheduled
 *
 * Omit the e-mail fields entirely and the candidate is rejected silently. Supply
 * a template and Greenhouse sends it; supply `send_email_at` as well and it goes
 * out at that future timestamp instead of immediately. That delay is the one
 * feature here worth reaching for deliberately — it is how a rejection issued by
 * an automation avoids landing thirty seconds after an interview.
 *
 * ## Not idempotent, and reversible
 *
 * Answers **204 with no body**. Rejecting an already-rejected application is not
 * a no-op — it is a 422 — so this is `idempotent: false`. `unreject` exists on
 * the same resource for the recoverable case, though this app does not model it;
 * see `README.md`.
 */
interface Input {
  applicationId: number;
  rejectionReasonId: number;
  notes?: string;
  emailTemplateId?: number;
  emailFromUserId?: number;
  sendEmailAt?: string;
}

const rejectApplication: ActionDefinition<Input> = {
  key: "reject-application",
  type: "perform",
  resource: "application",
  title: "Reject Application",
  description:
    "Reject an application with a reason, optionally sending or scheduling a rejection e-mail.",
  idempotent: false,
  params: [
    {
      key: "applicationId",
      label: "Application id",
      type: "number",
      required: true,
      validation: { integer: true, min: 1 },
    },
    {
      key: "rejectionReasonId",
      label: "Rejection reason id",
      type: "number",
      required: true,
      validation: { integer: true, min: 1 },
      hint: "From the List Rejection Reasons action. Store the id, not the name — reason names " +
        "are editable by the customer.",
    },
    {
      key: "notes",
      label: "Notes",
      type: "text",
      hint: "Internal context recorded alongside the rejection. Not shown to the candidate.",
    },
    {
      key: "emailTemplateId",
      label: "Rejection e-mail template id",
      type: "number",
      validation: { integer: true, min: 1 },
      hint: "Leave empty to reject silently. Template ids come from Greenhouse's e-mail " +
        "templates.",
    },
    {
      key: "emailFromUserId",
      label: "Send e-mail as user id",
      type: "number",
      validation: { integer: true, min: 1 },
      dependsOn: ["emailTemplateId"],
    },
    {
      key: "sendEmailAt",
      label: "Send e-mail at",
      type: "datetime",
      dependsOn: ["emailTemplateId"],
      hint: "Schedules the rejection e-mail for a future moment instead of sending it " +
        "immediately — the usual reason to prefer this over an instant send.",
    },
  ],
  output: [{ key: "status", type: "number", label: "HTTP status — 204 on success, no body" }],

  async execute(input, ctx) {
    const body: Record<string, unknown> = { rejection_reason_id: input.rejectionReasonId };
    if (input.notes) body.notes = input.notes;

    const email: Record<string, unknown> = {};
    if (input.emailTemplateId) email.email_template_id = input.emailTemplateId;
    if (input.emailFromUserId) email.email_from_user_id = input.emailFromUserId;
    if (input.sendEmailAt) email.send_email_at = input.sendEmailAt;
    if (Object.keys(email).length > 0) body.rejection_email = email;

    ctx.log("info", "rejecting application", {
      applicationId: input.applicationId,
      sendsEmail: input.emailTemplateId !== undefined,
    });
    const status = await new HarvestClient(ctx).status(
      `/applications/${encodeId(input.applicationId)}/reject`,
      { method: "POST", body },
    );
    return { status };
  },
};

export default rejectApplication;
