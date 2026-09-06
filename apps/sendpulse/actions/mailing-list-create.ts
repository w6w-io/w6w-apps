import type { ActionDefinition } from "@w6w/types";
import { SendPulseClient } from "../lib/client.ts";

interface Input {
  bookName: string;
}

/**
 * `POST /addressbooks` — creates a mailing list (SendPulse calls it an
 * "address book" internally; every other surface, including this action,
 * uses "mailing list"). Names must be unique per account — a duplicate
 * answers `422` with `{"message":"Name already in use","error_code":203}`
 * per the vendor's own OpenAPI example.
 */
const action: ActionDefinition<Input> = {
  key: "mailing-list-create",
  type: "perform",
  resource: "mailing-list",
  title: "Create a mailing list",
  description: "Create a new mailing list. The name must be unique in the account.",
  idempotent: false,
  params: [
    { key: "bookName", label: "Name", type: "string", required: true },
  ],
  output: [
    { key: "id", type: "number", label: "Mailing list ID" },
  ],

  async execute(input, ctx) {
    return await new SendPulseClient(ctx).bulkEmail("/addressbooks", {
      method: "POST",
      body: { bookName: input.bookName },
    });
  },
};

export default action;
