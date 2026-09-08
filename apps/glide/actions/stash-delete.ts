import type { ActionDefinition } from "@w6w/types";
import { assertStashToken, GlideClient } from "../lib/client.ts";

/**
 * `DELETE /stashes/{stashID}` — delete a stash and all the data it contains.
 *
 * Optional: Glide deletes every stash automatically within 48 hours of
 * creation regardless. Useful once a stash has been consumed by Create Table /
 * Overwrite Table / Add Rows to Table and there is no reason to keep it
 * around.
 */
interface Input {
  stashId: string;
}

const stashDelete: ActionDefinition<Input, Record<string, never>> = {
  key: "stash-delete",
  type: "perform",
  resource: "stash",
  title: "Delete Stash",
  description: "Delete a stash and all data it contains.",
  idempotent: true,
  params: [
    {
      key: "stashId",
      label: "Stash ID",
      type: "string",
      required: true,
      placeholder: "20240215-job32",
    },
  ],
  output: [],

  execute(input, ctx) {
    const stashId = assertStashToken(input.stashId, "Stash ID");
    return new GlideClient(ctx).data<Record<string, never>>(
      `/stashes/${encodeURIComponent(stashId)}`,
      { method: "DELETE" },
    );
  },
};

export default stashDelete;
