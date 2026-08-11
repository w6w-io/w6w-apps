import type { ActionDefinition } from "@w6w/types";
import { CampaignMonitorClient, encodeId } from "../lib/client.ts";
import { listIdParam } from "../lib/params.ts";

/**
 * `GET /api/v3.3/lists/{listid}.json` — a list's settings. **List-level.**
 *
 * No client id is needed: a list id already identifies the client that owns it.
 * (Address a list belonging to another account and the API answers `401` with
 * code 102, "Invalid ClientID" — a 401 that has nothing to do with the
 * credential. See `lib/client.ts#CODE_MEANINGS`.)
 *
 * `UnsubscribeSetting` here is the field described in `list-create`, and it is
 * what decides whether this list honours the client-wide suppression list.
 */
interface Input {
  listId: string;
}

interface ListDetails {
  ListID: string;
  Title: string;
  ConfirmedOptIn: boolean;
  UnsubscribeSetting: string;
  UnsubscribePage?: string;
  ConfirmationSuccessPage?: string;
}

const listGet: ActionDefinition<Input, ListDetails> = {
  key: "list-get",
  type: "read",
  resource: "list",
  title: "Get List",
  description:
    "Read a list's title, opt-in type, unsubscribe setting and the custom unsubscribe and " +
    "confirmation page URLs.",
  params: [listIdParam],
  output: [
    { key: "ListID", type: "string", label: "List ID" },
    { key: "Title", type: "string", label: "List title" },
    { key: "ConfirmedOptIn", type: "boolean", label: "Double opt-in" },
    {
      key: "UnsubscribeSetting",
      type: "string",
      label: "AllClientLists | OnlyThisList",
    },
    { key: "UnsubscribePage", type: "string", label: "Custom unsubscribe page" },
    { key: "ConfirmationSuccessPage", type: "string", label: "Custom confirmation page" },
  ],

  execute(input, ctx) {
    return new CampaignMonitorClient(ctx).json<ListDetails>(`/lists/${encodeId(input.listId)}`);
  },
};

export default listGet;
