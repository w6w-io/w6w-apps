import type { ActionDefinition } from "@w6w/types";
import { FirefliesClient } from "../lib/client.ts";

interface Input {
  meetingId: string;
  email: string;
}

const MUTATION = `
  mutation RevokeSharedMeetingAccess($input: RevokeSharedMeetingAccessInput!) {
    revokeSharedMeetingAccess(input: $input) {
      success
      message
    }
  }
`;

const meetingShareRevoke: ActionDefinition<Input> = {
  key: "meeting-share-revoke",
  type: "perform",
  resource: "transcript",
  title: "Revoke Shared Meeting Access",
  description: "Take away a previously shared external user's access to a meeting transcript.",
  idempotent: true,
  params: [
    { key: "meetingId", label: "Meeting ID", type: "string", required: true },
    {
      key: "email",
      label: "Email address",
      type: "string",
      required: true,
      hint: "One address per call. A transcript's current shares are on its `shared_with` field.",
    },
  ],
  output: [
    { key: "revokeSharedMeetingAccess.success", type: "boolean", label: "Revoked" },
    { key: "revokeSharedMeetingAccess.message", type: "string", label: "Message" },
  ],

  execute(input, ctx) {
    return new FirefliesClient(ctx).query(MUTATION, {
      input: { meeting_id: input.meetingId, email: input.email },
    });
  },
};

export default meetingShareRevoke;
