import type { ActionDefinition } from "@w6w/types";
import {
  API_BASE,
  API_PREFIX,
  AweberClient,
  compact,
  encodeId,
  locationId,
} from "../lib/client.ts";
import { accountIdParam, listIdParam, subscriberIdParam } from "../lib/params.ts";

/**
 * `POST /accounts/{accountId}/lists/{listId}/subscribers/{subscriberId}` with
 * `{"ws.op": "move", "list_link": "..."}` — move a subscriber from this list
 * to another list on the same account.
 *
 * `list_link` must be the destination list's full `self_link` URL, not a bare
 * id — this action builds it from `destinationListId` so a caller only ever
 * has to supply an id, matching every other action in this app.
 *
 * Answers `201` with a `Location` header and no body, like Add Subscriber.
 * Not idempotent: once moved, the subscriber no longer exists at the
 * original `(listId, subscriberId)` pair, so a retry of this same call
 * fails rather than repeating the move.
 */
interface Input {
  accountId: string;
  listId: string;
  subscriberId: string;
  destinationListId: string;
  enforceCustomFieldMapping?: boolean;
}

const subscriberMove: ActionDefinition<Input> = {
  key: "subscriber-move",
  type: "perform",
  resource: "subscriber",
  title: "Move Subscriber",
  description: "Move a subscriber from one list to another list on the same account.",
  idempotent: false,
  params: [
    accountIdParam,
    listIdParam,
    subscriberIdParam,
    { key: "destinationListId", label: "Destination list ID", type: "string", required: true },
    {
      key: "enforceCustomFieldMapping",
      label: "Enforce custom field mapping",
      type: "boolean",
      hint: "Fail the move if the origin list's custom fields don't match (case-insensitively) " +
        "the destination list's.",
    },
  ],
  output: [
    { key: "id", type: "number", label: "Subscriber ID at the destination list" },
    { key: "location", type: "string", label: "URL of the moved subscriber" },
  ],

  async execute(input, ctx) {
    const { accountId, listId, subscriberId, destinationListId } = input;
    const listLink = `${API_BASE}${API_PREFIX}/accounts/${encodeId(accountId)}/lists/${
      encodeId(destinationListId)
    }`;

    const res = await new AweberClient(ctx).raw(
      `/accounts/${encodeId(accountId)}/lists/${encodeId(listId)}/subscribers/${
        encodeId(subscriberId)
      }`,
      {
        method: "POST",
        body: compact({
          "ws.op": "move",
          list_link: listLink,
          enforce_custom_field_mapping: input.enforceCustomFieldMapping,
        }),
      },
    );
    const location = res.headers.get("location");
    return { id: locationId(location), location: location ?? undefined };
  },
};

export default subscriberMove;
