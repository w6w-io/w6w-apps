import type { ActionDefinition } from "@w6w/types";
import { AirparserClient } from "../lib/client.ts";

/**
 * `POST /inboxes/{inboxId}/schema-clone` — copy the source inbox's extraction
 * schema onto a destination inbox, replacing whatever schema it had.
 *
 * **The response is a bare boolean**, not an object — see `lib/client.ts`.
 * This action returns `{ cloned: <bool> }` so a workflow gets a named field;
 * `false` means the vendor reports the clone did not happen (the docs do not
 * say why a clone can fail short of an HTTP error).
 */
interface Input {
  inboxId: string;
  destinationInboxId: string;
}

const schemaClone: ActionDefinition<Input, { cloned: boolean }> = {
  key: "schema-clone",
  type: "perform",
  resource: "schema",
  title: "Clone Extraction Schema",
  description:
    "Copy this inbox's extraction schema onto a destination inbox, replacing its existing schema.",
  idempotent: true,
  params: [
    { key: "inboxId", label: "Source inbox", type: "string", required: true },
    { key: "destinationInboxId", label: "Destination inbox", type: "string", required: true },
  ],
  output: [
    { key: "cloned", type: "boolean", label: "Schema was cloned" },
  ],

  async execute(input, ctx) {
    const cloned = await new AirparserClient(ctx).request<boolean>(
      `/inboxes/${encodeURIComponent(input.inboxId)}/schema-clone`,
      { method: "POST", body: { destination_inbox_id: input.destinationInboxId } },
    );
    return { cloned: cloned === true };
  },
};

export default schemaClone;
