import type { ActionDefinition } from "@w6w/types";
import { FirefliesClient } from "../lib/client.ts";

interface Input {
  transcriptId: string;
}

/**
 * The mutation returns the fields of the transcript it just deleted, which is
 * the only record of it that will exist afterwards — so a useful selection set
 * matters more here than on a read.
 */
const MUTATION = `
  mutation DeleteTranscript($transcriptId: String!) {
    deleteTranscript(id: $transcriptId) {
      id
      title
      date
      dateString
      duration
      organizer_email
      participants
      transcript_url
    }
  }
`;

const transcriptDelete: ActionDefinition<Input> = {
  key: "transcript-delete",
  type: "perform",
  resource: "transcript",
  title: "Delete Transcript",
  description:
    "Permanently delete a meeting transcript. Returns the deleted record — the only copy you will have.",
  // Deleting an already-deleted transcript is not a no-op: it fails with
  // `object_not_found`, so a retry after a network timeout reports an error
  // for work that in fact succeeded.
  idempotent: false,
  params: [
    {
      key: "transcriptId",
      label: "Transcript ID",
      type: "string",
      required: true,
      hint:
        "You may delete your own meetings; deleting a teammate's needs team admin. Rate limited to 10 per minute.",
    },
  ],
  output: [
    { key: "deleteTranscript.id", type: "string", label: "Transcript ID" },
    { key: "deleteTranscript.title", type: "string", label: "Title" },
    { key: "deleteTranscript.dateString", type: "string", label: "Date (ISO 8601)" },
    { key: "deleteTranscript.duration", type: "number", label: "Duration (minutes)" },
  ],

  execute(input, ctx) {
    ctx.log("warn", "deleting a Fireflies transcript", { transcriptId: input.transcriptId });
    return new FirefliesClient(ctx).query(MUTATION, { transcriptId: input.transcriptId });
  },
};

export default transcriptDelete;
