import type { ActionDefinition } from "@w6w/types";
import { HeartbeatClient } from "../lib/client.ts";

/**
 * `POST /v0/invitations/{invitationID}` — add emails to an existing
 * invitation link.
 *
 * Marked non-idempotent on purpose: when `shouldSendEmail` is true, Heartbeat
 * sends an invitation email to every listed address on *every* call — a
 * retry after a dropped response re-sends that email even if the addresses
 * are unchanged, which is a real, visible side effect, not a harmless no-op.
 */
interface Input {
  invitationID: string;
  emails: string[] | string;
  shouldSendEmail: boolean;
}

const updateInvitation: ActionDefinition<Input> = {
  key: "update-invitation",
  type: "perform",
  resource: "invitation",
  title: "Add Users to Invitation",
  description: "Add email addresses to an existing invitation link.",
  idempotent: false,
  params: [
    { key: "invitationID", label: "Invitation ID", type: "string", required: true },
    { key: "emails", label: "Emails", type: "multiselect", required: true },
    {
      key: "shouldSendEmail",
      label: "Send invitation email",
      type: "boolean",
      required: true,
      hint: "If false, the addresses may sign up via the link but receive no email from Heartbeat.",
    },
  ],
  output: [],

  execute(input, ctx) {
    const emails = Array.isArray(input.emails)
      ? input.emails
      : input.emails.split(",").map((s) => s.trim()).filter(Boolean);
    return new HeartbeatClient(ctx).json(`/invitations/${encodeURIComponent(input.invitationID)}`, {
      method: "POST",
      body: { emails, shouldSendEmail: input.shouldSendEmail },
    });
  },
};

export default updateInvitation;
