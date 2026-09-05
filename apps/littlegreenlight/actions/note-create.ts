import type { ActionDefinition } from "@w6w/types";
import { compact, LglClient } from "../lib/client.ts";

interface Input {
  constituent_id: number;
  text: string;
  original_date: string;
  note_type_id?: number;
  note_type_name?: string;
  external_id?: string;
}

/** `POST /api/v1/constituents/{constituent_id}/notes.json`. */
const noteCreate: ActionDefinition<Input> = {
  key: "note-create",
  type: "perform",
  resource: "note",
  title: "Create Note",
  description: "Log a new note against a constituent.",
  idempotent: false,
  params: [
    {
      key: "constituent_id",
      label: "Constituent ID",
      type: "number",
      required: true,
      validation: { integer: true, min: 1 },
    },
    { key: "text", label: "Note text", type: "text", required: true },
    {
      key: "original_date",
      label: "Original date",
      type: "string",
      required: true,
      placeholder: "2026-01-01",
    },
    { key: "note_type_id", label: "Note type ID", type: "number", validation: { integer: true } },
    { key: "note_type_name", label: "Note type name", type: "string" },
    { key: "external_id", label: "External ID", type: "string" },
  ],
  output: [
    { key: "id", type: "number", label: "Note ID" },
    { key: "text", type: "string", label: "Note text" },
  ],

  async execute(input, ctx) {
    const body = compact({
      text: input.text,
      original_date: input.original_date,
      note_type_id: input.note_type_id,
      note_type_name: input.note_type_name,
      external_id: input.external_id,
    });
    return await new LglClient(ctx).create(`/constituents/${input.constituent_id}/notes`, body);
  },
};

export default noteCreate;
