import type { ActionDefinition } from "@w6w/types";
import { csv, FirefliesClient } from "../lib/client.ts";

interface Input {
  meetingId: string;
  emails: string;
  expiryDays?: number;
}

const MUTATION = `
  mutation ShareMeeting($input: ShareMeetingInput!) {
    shareMeeting(input: $input) {
      success
      message
    }
  }
`;

const meetingShare: ActionDefinition<Input> = {
  key: "meeting-share",
  type: "perform",
  resource: "transcript",
  title: "Share Meeting",
  description:
    "Share a meeting transcript by email with people outside the team. They do not need a Fireflies account.",
  // Re-sharing with the same address grants the same access; it also re-sends
  // the notification, and spends one of the 10 calls per hour.
  idempotent: true,
  params: [
    { key: "meetingId", label: "Meeting ID", type: "string", required: true },
    {
      key: "emails",
      label: "Email addresses",
      type: "string",
      required: true,
      hint: "Comma-separated. Up to 50 per request; the mutation allows 10 requests per hour.",
    },
    {
      key: "expiryDays",
      label: "Expires after",
      type: "select",
      options: [
        { value: 7, label: "7 days" },
        { value: 14, label: "14 days" },
        { value: 30, label: "30 days" },
      ],
      hint: "Fireflies accepts only 7, 14 or 30. Leave blank for access that never expires.",
    },
  ],
  output: [
    { key: "shareMeeting.success", type: "boolean", label: "Shared" },
    { key: "shareMeeting.message", type: "string", label: "Message" },
  ],

  execute(input, ctx) {
    return new FirefliesClient(ctx).query(MUTATION, {
      input: {
        meeting_id: input.meetingId,
        emails: csv(input.emails),
        expiry_days: input.expiryDays,
      },
    });
  },
};

export default meetingShare;
