import type { ActionDefinition } from "@w6w/types";
import { asJson, assertStashToken, GlideClient } from "../lib/client.ts";

/**
 * `PUT /stashes/{stashID}/{serial}` — upload one chunk of a large dataset for
 * later reference (`{"$stashID": "..."}`) in Create Table, Overwrite Table, or
 * Add Rows to Table.
 *
 * Stash IDs and serials are caller-defined, not minted by Glide: **the id**
 * groups a dataset's chunks together, and **the serial** orders them — sorted
 * numerically when every serial in the stash parses as an integer, otherwise
 * lexicographically. Both are validated client-side against Glide's own
 * grammar (letters/numbers/hyphens/underscores, must start with a letter or
 * number, 256 characters max) so a malformed one is caught before the API's
 * generic `request_validation_error`.
 *
 * Glide automatically deletes a stash 48 hours after creation even if it is
 * never explicitly deleted (see Delete Stash).
 */
interface Input {
  stashId: string;
  serial: string;
  rows: unknown;
}

const stashData: ActionDefinition<Input, Record<string, never>> = {
  key: "stash-data",
  type: "perform",
  resource: "stash",
  title: "Stash Data",
  description: "Upload one chunk of a large dataset to a stash, for use by Create/Overwrite " +
    "Table or Add Rows to Table.",
  idempotent: true,
  params: [
    {
      key: "stashId",
      label: "Stash ID",
      type: "string",
      required: true,
      placeholder: "20240215-job32",
      hint: "Your own identifier grouping this dataset's chunks. Letters, numbers, hyphens, " +
        "underscores; must start with a letter or number; 256 characters max.",
    },
    {
      key: "serial",
      label: "Serial",
      type: "string",
      required: true,
      placeholder: "1",
      hint: "Orders this chunk within the stash. Same grammar as Stash ID; integer serials sort " +
        "numerically, everything else sorts lexicographically.",
    },
    {
      key: "rows",
      label: "Rows",
      type: "json",
      required: true,
      hint: "An array of row objects — this chunk of the overall dataset.",
    },
  ],
  output: [],

  execute(input, ctx) {
    const stashId = assertStashToken(input.stashId, "Stash ID");
    const serial = assertStashToken(input.serial, "Serial");
    return new GlideClient(ctx).data<Record<string, never>>(
      `/stashes/${encodeURIComponent(stashId)}/${encodeURIComponent(serial)}`,
      { method: "PUT", body: asJson<unknown[]>(input.rows, "Rows") },
    );
  },
};

export default stashData;
