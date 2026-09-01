import type { ActionDefinition } from "@w6w/types";
import { FreshsalesClient } from "../lib/client.ts";
import { targetableTypeOptions } from "../lib/params.ts";

interface Input {
  description: string;
  targetableType: "Contact" | "SalesAccount" | "Deal";
  targetableId: number;
}

const noteCreate: ActionDefinition<Input> = {
  key: "note-create",
  type: "perform",
  resource: "note",
  title: "Create Note",
  description: "Log a note against a contact, an account or a deal.",
  idempotent: false,
  params: [
    { key: "description", label: "Note", type: "text", required: true },
    {
      key: "targetableType",
      label: "Attach to",
      type: "select",
      required: true,
      row: "target",
      options: targetableTypeOptions,
    },
    { key: "targetableId", label: "Record ID", type: "number", required: true, row: "target" },
  ],
  output: [
    { key: "id", type: "number", label: "Note ID" },
    { key: "description", type: "string", label: "Note" },
  ],

  execute(input, ctx) {
    return new FreshsalesClient(ctx).resource("note", "/notes", {
      method: "POST",
      body: {
        note: {
          description: input.description,
          targetable_type: input.targetableType,
          targetable_id: input.targetableId,
        },
      },
    });
  },
};

export default noteCreate;
