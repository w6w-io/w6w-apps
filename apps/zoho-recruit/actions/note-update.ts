import type { ActionDefinition } from "@w6w/types";
import {
  unwrapRecordResult,
  ZohoRecruitClient,
  type ZohoRecruitRecordResult,
} from "../lib/client.ts";
import { writeOutput } from "../lib/params.ts";

interface Input {
  noteId: string;
  title?: string;
  content?: string;
}

/** `PUT /Notes/{note_id}` — updates an existing Note's title and/or content. */
const noteUpdate: ActionDefinition<Input, ZohoRecruitRecordResult> = {
  key: "note-update",
  type: "perform",
  resource: "note",
  title: "Update Note",
  description: "Update an existing Note's title and/or content.",
  idempotent: true,
  params: [
    { key: "noteId", label: "Note ID", type: "string", required: true },
    { key: "title", label: "Title", type: "string" },
    { key: "content", label: "Content", type: "text" },
  ],
  output: writeOutput,

  execute(input, ctx) {
    const fields: Record<string, unknown> = {};
    if (input.title !== undefined) fields.Note_Title = input.title;
    if (input.content !== undefined) fields.Note_Content = input.content;

    return new ZohoRecruitClient(ctx)
      .request<{ data: ZohoRecruitRecordResult[] }>(`/Notes/${encodeURIComponent(input.noteId)}`, {
        method: "PUT",
        body: { data: [fields] },
      })
      .then(unwrapRecordResult);
  },
};

export default noteUpdate;
