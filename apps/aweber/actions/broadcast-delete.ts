import type { ActionDefinition } from "@w6w/types";
import { AweberClient, encodeId } from "../lib/client.ts";
import { accountIdParam, broadcastIdParam, listIdParam } from "../lib/params.ts";

/**
 * `DELETE /accounts/{accountId}/lists/{listId}/broadcasts/{broadcastId}` —
 * answers a plain `204`, unlike the subscriber/custom-field deletes in this
 * app which answer `200`. Only drafts created by the API can be deleted.
 */
interface Input {
  accountId: string;
  listId: string;
  broadcastId: string;
}

const broadcastDelete: ActionDefinition<Input> = {
  key: "broadcast-delete",
  type: "perform",
  resource: "broadcast",
  title: "Delete Broadcast",
  description: "Delete a draft broadcast. API-created drafts only.",
  idempotent: true,
  params: [accountIdParam, listIdParam, broadcastIdParam],
  output: [{ key: "status", type: "number", label: "HTTP status" }],

  async execute(input, ctx) {
    const { accountId, listId, broadcastId } = input;
    const res = await new AweberClient(ctx).raw(
      `/accounts/${encodeId(accountId)}/lists/${encodeId(listId)}/broadcasts/${
        encodeId(broadcastId)
      }`,
      { method: "DELETE" },
    );
    return { status: res.status };
  },
};

export default broadcastDelete;
