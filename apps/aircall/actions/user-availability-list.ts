import type { ActionDefinition } from "@w6w/types";
import { AircallClient } from "../lib/client.ts";
import {
  listOutput,
  listResult,
  type PaginationInput,
  paginationParams,
  paginationQuery,
  type WindowInput,
  windowParams,
  windowQuery,
} from "../lib/params.ts";

type Input = PaginationInput & WindowInput;

/**
 * `GET /v1/users/availabilities` — the operational availability of every User.
 *
 * **This is the only place the granular statuses live.** The `availability_status`
 * on a User object is the coarse working-hours field — `available`, `custom`,
 * `unavailable` — while this endpoint returns what the Dashboard's Activity Feed
 * shows: `available`, `offline`, `do_not_disturb`, `in_call`,
 * `after_call_work`. "Is this agent free right now?" is only answerable here.
 *
 * **v1 on purpose.** Aircall's v2 User surface has no availability endpoint at
 * all — it publishes list, retrieve, create, update and numbers, and nothing
 * else — so the deprecation banner on the v1 User *object* endpoints does not
 * offer a migration target for this one. It is called on v1 because v1 is where
 * it exists.
 *
 * The rows are `{id, availability}` pairs, not full User objects.
 */
const userAvailabilityList: ActionDefinition<Input> = {
  key: "user-availability-list",
  type: "read",
  resource: "user",
  title: "List User Availability",
  description:
    "Operational availability for every User — available, offline, do_not_disturb, in_call or " +
    "after_call_work. The only endpoint that reports the granular status.",
  params: [...windowParams("Users"), ...paginationParams()],
  output: listOutput,

  async execute(input, ctx) {
    const client = new AircallClient(ctx);
    const { meta, items } = await client.list<Record<string, unknown>>(
      "/users/availabilities",
      "users",
      { query: { ...windowQuery(input), ...paginationQuery(input) } },
    );
    return listResult(meta, items);
  },
};

export default userAvailabilityList;
