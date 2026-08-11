import type { ActionDefinition } from "@w6w/types";
import { FirefliesClient } from "../lib/client.ts";

interface Input {
  transcriptId: string;
  privacy: string;
}

const MUTATION = `
  mutation UpdateMeetingPrivacy($input: UpdateMeetingPrivacyInput!) {
    updateMeetingPrivacy(input: $input) {
      id
      title
      privacy
    }
  }
`;

const meetingPrivacyUpdate: ActionDefinition<Input> = {
  key: "meeting-privacy-update",
  type: "perform",
  resource: "transcript",
  title: "Update Meeting Privacy",
  description: "Change who can see a meeting transcript. Requires ownership or team admin.",
  idempotent: true,
  params: [
    { key: "transcriptId", label: "Transcript ID", type: "string", required: true },
    {
      key: "privacy",
      label: "Privacy",
      type: "select",
      required: true,
      options: [
        { value: "owner", label: "Owner only" },
        { value: "participants", label: "Participants only" },
        { value: "teammates", label: "Teammates only" },
        { value: "teammatesandparticipants", label: "Teammates and participants" },
        { value: "link", label: "Anyone with the link" },
      ],
      hint: "Fireflies expects these exact lowercase values.",
    },
  ],
  output: [
    { key: "updateMeetingPrivacy.id", type: "string", label: "Transcript ID" },
    { key: "updateMeetingPrivacy.title", type: "string", label: "Title" },
    { key: "updateMeetingPrivacy.privacy", type: "string", label: "Privacy" },
  ],

  execute(input, ctx) {
    return new FirefliesClient(ctx).query(MUTATION, {
      input: { id: input.transcriptId, privacy: input.privacy },
    });
  },
};

export default meetingPrivacyUpdate;
