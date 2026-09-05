import type { ActionDefinition } from "@w6w/types";
import {
  unwrapRecordResult,
  ZohoRecruitClient,
  type ZohoRecruitRecordResult,
} from "../lib/client.ts";
import { writeOutput } from "../lib/params.ts";

interface Input {
  noteId: string;
}

/** `DELETE /Notes?ids={note_id}` — deletes a single Note. */
const noteDelete: ActionDefinition<Input, ZohoRecruitRecordResult> = {
  key: "note-delete",
  type: "perform",
  resource: "note",
  title: "Delete Note",
  description: "Delete a Note.",
  idempotent: true,
  params: [{ key: "noteId", label: "Note ID", type: "string", required: true }],
  output: writeOutput,

  execute(input, ctx) {
    return new ZohoRecruitClient(ctx)
      .request<{ data: ZohoRecruitRecordResult[] }>("/Notes", {
        method: "DELETE",
        query: { ids: input.noteId },
      })
      .then(unwrapRecordResult);
  },
};

export default noteDelete;
