import type { ActionDefinition } from "@w6w/types";
import { FirefliesClient } from "../lib/client.ts";

interface Input {
  transcriptId: string;
  title: string;
}

const MUTATION = `
  mutation UpdateMeetingTitle($input: UpdateMeetingTitleInput!) {
    updateMeetingTitle(input: $input) {
      title
    }
  }
`;

const meetingTitleUpdate: ActionDefinition<Input> = {
  key: "meeting-title-update",
  type: "perform",
  resource: "transcript",
  title: "Update Meeting Title",
  description: "Rename a meeting transcript. Requires team admin privileges.",
  // Writing the same title twice leaves the same title.
  idempotent: true,
  params: [
    { key: "transcriptId", label: "Transcript ID", type: "string", required: true },
    {
      key: "title",
      label: "New title",
      type: "string",
      required: true,
      validation: { minLength: 5, maxLength: 256 },
      hint: "Fireflies requires 5–256 characters and rejects special characters.",
    },
  ],
  output: [
    { key: "updateMeetingTitle.title", type: "string", label: "Title" },
  ],

  execute(input, ctx) {
    return new FirefliesClient(ctx).query(MUTATION, {
      input: { id: input.transcriptId, title: input.title },
    });
  },
};

export default meetingTitleUpdate;
