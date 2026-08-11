import type { ActionDefinition } from "@w6w/types";
import { AircallClient } from "../lib/client.ts";
import {
  contactOrderByOptions,
  listOutput,
  listResult,
  type PaginationInput,
  paginationParams,
  paginationQuery,
  type WindowInput,
  windowParams,
  windowQuery,
} from "../lib/params.ts";

interface Input extends PaginationInput, WindowInput {
  orderBy?: string;
}

/**
 * `GET /v1/contacts` — the company's **shared** Contacts.
 *
 * Two exclusions are worth reading before treating this as "all contacts":
 *
 *  - **Only shared Contacts exist here.** Aircall: "Fetch all the shared
 *    Contacts associated to a company", and everything created through the
 *    Public API is shared automatically. A user's personal contacts are not
 *    reachable.
 *  - **Contacts synced from a third-party integration are invisible to this
 *    API.** Aircall says so plainly: "contacts created by third-party
 *    integrations will not be accessible from the public-api, but you will still
 *    be able to see them in Aircall Workspace." So a Contact an agent can see on
 *    screen may simply not be listed here, and that is not a bug to chase.
 *
 * Like Calls, paging reaches at most 10,000 Contacts; narrow with `from`
 * instead of paging deeper.
 *
 * `orderBy` is unique to the Contact endpoints — it is the only place the sort
 * field can be switched from `created_at` to `updated_at`, which is what makes
 * an incremental "changed since" sync possible at all.
 */
const contactList: ActionDefinition<Input> = {
  key: "contact-list",
  type: "read",
  resource: "contact",
  title: "List Contacts",
  description:
    "List the company's shared Contacts. Contacts synced from third-party integrations are not " +
    "exposed by the API even though Workspace shows them.",
  params: [
    ...windowParams("Contacts"),
    {
      key: "orderBy",
      label: "Order by",
      type: "select",
      options: contactOrderByOptions,
      hint: "Switch to `updated_at` to drive an incremental sync of changed Contacts.",
    },
    ...paginationParams(),
  ],
  output: listOutput,

  async execute(input, ctx) {
    const client = new AircallClient(ctx);
    const { meta, items } = await client.list<Record<string, unknown>>("/contacts", "contacts", {
      query: { ...windowQuery(input), ...paginationQuery(input), order_by: input.orderBy },
    });
    return listResult(meta, items);
  },
};

export default contactList;
