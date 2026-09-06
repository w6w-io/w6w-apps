import type { ActionDefinition } from "@w6w/types";
import { stripSecrets, VapiClient } from "../lib/client.ts";
import { idParam } from "../lib/params.ts";

/**
 * `DELETE /call/{id}` — `CallController_deleteCallData` in the vendor's own
 * operation id.
 *
 * This erases the call's stored DATA (recordings, transcript, artifacts) — it
 * does NOT hang up a live call, which has no REST endpoint at all (see
 * `call-update.ts`). Calling this on an in-progress call does not stop it.
 *
 * The vendor documents a `503` specifically for "failed to erase call
 * recordings; the call was not deleted. Retry the request." — a real,
 * distinct failure mode worth retrying rather than treating as a hard error.
 */
interface Input {
  id: string;
}

const callDelete: ActionDefinition<Input> = {
  key: "call-delete",
  type: "perform",
  resource: "call",
  title: "Delete Call Data",
  description:
    "Erase a call's stored recordings, transcript and artifacts. Does NOT end a live call.",
  idempotent: true,
  params: [idParam("Call ID")],
  output: [
    { key: "id", type: "string", label: "Call ID" },
    { key: "status", type: "string", label: "Status" },
  ],

  async execute(input, ctx) {
    const call = await new VapiClient(ctx).json(`/call/${encodeURIComponent(input.id)}`, {
      method: "DELETE",
    });
    return stripSecrets(call);
  },
};

export default callDelete;
