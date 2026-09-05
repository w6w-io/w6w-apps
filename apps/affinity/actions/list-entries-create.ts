import type { ActionDefinition } from "@w6w/types";
import { AffinityClient, compact } from "../lib/client.ts";
import { listIdPathParam } from "../lib/params.ts";

/**
 * `POST /lists/{list_id}/list-entries` — adds an existing person or
 * organization to a List. Opportunities cannot be created this way; the docs
 * point to `POST /opportunities` instead (`opportunities-create`).
 */
interface Input {
  listId: number;
  entityId: number;
  creatorId?: number;
}

const listEntriesCreate: ActionDefinition<Input> = {
  key: "list-entries-create",
  type: "perform",
  resource: "list-entry",
  title: "Add Entry To List",
  description: "Add an existing person or organization to a List as a new entry.",
  idempotent: false,
  params: [
    listIdPathParam,
    {
      key: "entityId",
      label: "Person or Organization ID",
      type: "number",
      required: true,
      validation: { integer: true },
      hint: "Opportunities cannot be added this way — use Create Opportunity instead.",
    },
    {
      key: "creatorId",
      label: "Creator (internal person ID)",
      type: "number",
      validation: { integer: true },
      hint: "Defaults to the owner of this API key.",
    },
  ],
  output: [{ key: "id", type: "number", label: "List Entry ID" }],

  execute(input, ctx) {
    return new AffinityClient(ctx).json(`/lists/${input.listId}/list-entries`, {
      method: "POST",
      body: compact({ entity_id: input.entityId, creator_id: input.creatorId }),
    });
  },
};

export default listEntriesCreate;
