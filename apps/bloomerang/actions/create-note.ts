import type { ActionDefinition } from "@w6w/types";
import { BloomerangClient, compact } from "../lib/client.ts";

interface Input {
  accountId: number;
  date?: string;
  note: string;
}

/**
 * `POST /note` — add a Note to a constituent's timeline.
 *
 * Confirmed against the OpenAPI document: the request body's base fields are
 * `AccountId`, `Date` and `Note` (plus `CustomValues`, out of scope here).
 *
 * Not idempotent: each call appends another Note; Bloomerang offers no
 * idempotency key on this endpoint.
 */
const createNote: ActionDefinition<Input> = {
  key: "create-note",
  type: "perform",
  resource: "note",
  title: "Create Note",
  description: "Add a note to a constituent's timeline.",
  idempotent: false,
  params: [
    { key: "accountId", label: "Constituent ID", type: "number", required: true },
    {
      key: "date",
      label: "Date",
      type: "date",
      hint: "Defaults to today in Bloomerang when omitted.",
    },
    { key: "note", label: "Note", type: "text", required: true },
  ],
  output: [{ key: "Id", type: "number", label: "Note ID" }],

  execute(input, ctx) {
    const body = compact({
      AccountId: input.accountId,
      Date: input.date,
      Note: input.note,
    });
    return new BloomerangClient(ctx).request("/note", { method: "POST", body });
  },
};

export default createNote;
