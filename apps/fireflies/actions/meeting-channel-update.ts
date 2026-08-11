import type { ActionDefinition } from "@w6w/types";
import { csv, FirefliesClient } from "../lib/client.ts";

interface Input {
  transcriptIds: string;
  channelId: string;
}

const MUTATION = `
  mutation UpdateMeetingChannel($input: UpdateMeetingChannelInput!) {
    updateMeetingChannel(input: $input) {
      id
      title
      channels { id }
    }
  }
`;

const meetingChannelUpdate: ActionDefinition<Input> = {
  key: "meeting-channel-update",
  type: "perform",
  resource: "transcript",
  title: "Assign Meetings to a Channel",
  description:
    "Move 1–5 transcripts into a channel. All-or-nothing: if one fails validation, none are moved.",
  // A meeting belongs to exactly one channel and this sets it, so re-running
  // with the same input lands on the same state.
  idempotent: true,
  params: [
    {
      key: "transcriptIds",
      label: "Transcript IDs",
      type: "string",
      required: true,
      hint: "Comma-separated. Fireflies accepts 1–5 per call.",
    },
    {
      key: "channelId",
      label: "Channel ID",
      type: "string",
      required: true,
      hint: "From `channel-list`. A meeting can only be in one channel.",
    },
  ],
  output: [
    { key: "updateMeetingChannel", type: "array", label: "Updated transcripts" },
  ],

  execute(input, ctx) {
    return new FirefliesClient(ctx).query(MUTATION, {
      input: {
        transcript_ids: csv(input.transcriptIds),
        channel_id: input.channelId,
      },
    });
  },
};

export default meetingChannelUpdate;
