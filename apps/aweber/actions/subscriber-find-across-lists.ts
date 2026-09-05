import type { ActionDefinition } from "@w6w/types";
import { AweberClient, encodeId } from "../lib/client.ts";
import {
  accountIdParam,
  asOptionalJson,
  paginationParams,
  paginationQuery,
} from "../lib/params.ts";

/**
 * `GET /accounts/{accountId}?ws.op=findSubscribers` — search subscribers
 * across every list on the account at once, instead of one list at a time.
 * Each match carries `list_link` / `list_name` naming which list it was
 * found on — the one field this endpoint's result adds over
 * `subscriber-find`.
 */
interface Input {
  accountId: string;
  email?: string;
  name?: string;
  status?: string;
  tags?: string[] | string;
  extraFilters?: unknown;
  start?: number;
  size?: number;
}

const subscriberFindAcrossLists: ActionDefinition<Input> = {
  key: "subscriber-find-across-lists",
  type: "search",
  resource: "subscriber",
  title: "Find Subscribers Across Lists",
  description: "Search subscribers on every list of an account at once.",
  params: [
    accountIdParam,
    { key: "email", label: "Email", type: "string" },
    { key: "name", label: "Name", type: "string" },
    {
      key: "status",
      label: "Status",
      type: "select",
      options: [
        { value: "subscribed", label: "Subscribed" },
        { value: "unsubscribed", label: "Unsubscribed" },
        { value: "unconfirmed", label: "Unconfirmed" },
      ],
    },
    { key: "tags", label: "Has all tags", type: "multiselect" },
    {
      key: "extraFilters",
      label: "Extra filters",
      type: "json",
      hint: "Object of any other AWeber filter field to value, using AWeber's own query names.",
    },
    ...paginationParams(),
  ],
  output: [{
    key: "entries",
    type: "array",
    label: "Matching subscribers, with list_link/list_name",
  }],

  execute(input, ctx) {
    const tags = Array.isArray(input.tags) ? input.tags : input.tags ? [input.tags] : undefined;
    const extra = asOptionalJson<Record<string, string | number | boolean>>(
      input.extraFilters,
      "Extra filters",
    ) ?? {};

    return new AweberClient(ctx).list<Record<string, unknown>>(
      `/accounts/${encodeId(input.accountId)}`,
      {
        "ws.op": "findSubscribers",
        email: input.email,
        name: input.name,
        status: input.status,
        tags: tags?.length ? JSON.stringify(tags) : undefined,
        ...extra,
        ...paginationQuery(input),
      },
    );
  },
};

export default subscriberFindAcrossLists;
