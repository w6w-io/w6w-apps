import type { ActionDefinition } from "@w6w/types";
import { FirefliesClient } from "../lib/client.ts";

interface Input {
  meetingId: string;
  action: string;
}

const MUTATION = `
  mutation UpdateMeetingState($input: UpdateMeetingStateInput!) {
    updateMeetingState(input: $input) {
      success
      action
    }
  }
`;

const liveMeetingStateSet: ActionDefinition<Input> = {
  key: "live-meeting-state-set",
  type: "perform",
  resource: "live-meeting",
  title: "Pause or Resume Recording",
  description:
    "Pause or resume the notetaker's recording in a live meeting. The bot stays in the call either way.",
  // Setting the same state twice lands on the same state, so a retry is safe —
  // but it still spends one of the 10 calls per hour Fireflies allows.
  idempotent: true,
  params: [
    {
      key: "meetingId",
      label: "Meeting ID",
      type: "string",
      required: true,
      hint: "From `active-meeting-list`. This is a live meeting id, not a finished transcript id.",
    },
    {
      key: "action",
      label: "Action",
      type: "select",
      required: true,
      options: [
        { value: "pause_recording", label: "Pause recording" },
        { value: "resume_recording", label: "Resume recording" },
      ],
    },
  ],
  output: [
    { key: "updateMeetingState.success", type: "boolean", label: "Applied" },
    { key: "updateMeetingState.action", type: "string", label: "Action performed" },
  ],

  execute(input, ctx) {
    // Rate limited to 10 requests per hour across all plans.
    return new FirefliesClient(ctx).query(MUTATION, {
      input: { meeting_id: input.meetingId, action: input.action },
    });
  },
};

export default liveMeetingStateSet;
