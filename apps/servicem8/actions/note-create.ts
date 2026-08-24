import type { ActionDefinition } from "@w6w/types";
import { compact, ServiceM8Client } from "../lib/client.ts";

/**
 * `POST /note.json` — add a Note against a Job (or any other object type the
 * `related_object` field names). `NoteCreate` marks no field `required`, but a
 * note with no `note` text or no `related_object_uuid` is not useful, so both
 * are offered up front.
 */
interface Input {
  relatedObject?: string;
  relatedObjectUuid?: string;
  note?: string;
}

const noteCreate: ActionDefinition<Input, { uuid?: string }> = {
  key: "note-create",
  type: "perform",
  resource: "note",
  title: "Create Note",
  description: "Add a Note to a Job or other record. Returns only the new UUID.",
  idempotent: false,
  params: [
    {
      key: "relatedObject",
      label: "Related object type",
      type: "string",
      hint: 'e.g. "job".',
    },
    { key: "relatedObjectUuid", label: "Related object UUID", type: "string" },
    { key: "note", label: "Note text", type: "text" },
  ],
  output: [{ key: "uuid", type: "string", label: "New Note UUID (x-record-uuid)" }],

  async execute(input, ctx) {
    const { uuid } = await new ServiceM8Client(ctx).create(
      "/note.json",
      compact({
        related_object: input.relatedObject,
        related_object_uuid: input.relatedObjectUuid,
        note: input.note,
      }),
    );
    return { uuid };
  },
};

export default noteCreate;
