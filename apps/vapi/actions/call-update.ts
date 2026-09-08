import type { ActionDefinition } from "@w6w/types";
import { stripSecrets, VapiClient } from "../lib/client.ts";
import { idParam } from "../lib/params.ts";

/**
 * `PATCH /call/{id}`.
 *
 * `UpdateCallDTO` has exactly one field: `name`. There is no REST endpoint to
 * end a live call or change anything else about it — a call's own lifecycle
 * is driven by its transport (the phone/SIP leg or the client SDK's own
 * `.stop()`), not by this API.
 */
interface Input {
  id: string;
  name: string;
}

const callUpdate: ActionDefinition<Input> = {
  key: "call-update",
  type: "perform",
  resource: "call",
  title: "Rename Call",
  description: "Set a call's own-reference name. This is the only field Vapi allows updating.",
  idempotent: true,
  params: [
    idParam("Call ID"),
    { key: "name", label: "Name", type: "string", required: true, validation: { maxLength: 40 } },
  ],
  output: [
    { key: "id", type: "string", label: "Call ID" },
    { key: "name", type: "string", label: "Name" },
  ],

  async execute(input, ctx) {
    const call = await new VapiClient(ctx).json(`/call/${encodeURIComponent(input.id)}`, {
      method: "PATCH",
      body: { name: input.name },
    });
    return stripSecrets(call);
  },
};

export default callUpdate;
