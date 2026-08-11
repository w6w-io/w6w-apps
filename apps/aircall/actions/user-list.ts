import type { ActionDefinition } from "@w6w/types";
import { AircallClient, V2 } from "../lib/client.ts";
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
 * `GET /v2/users` — the company's Users.
 *
 * **v2, not v1, and that is a deliberate choice.** Every page of Aircall's User
 * V1 documentation carries the banner "User V1 API will be deprecated soon.
 * Please migrate to User V2 API"; the v2 surface exists precisely for this read
 * and carries no such notice.
 *
 * The one thing v2 takes away: **the v2 User object has no `numbers` array.**
 * Aircall states it outright ("Please note User v2 object doesn't include a
 * numbers object"), which is why `GET /v2/users/:id/numbers` exists — see the
 * List User Numbers action.
 *
 * `availability_status` here is the coarse three-value field
 * (`available` / `custom` / `unavailable`). For the operational one — `offline`,
 * `in_call`, `after_call_work`, `do_not_disturb` — use List User Availability,
 * which is v1-only.
 */
const userList: ActionDefinition<Input> = {
  key: "user-list",
  type: "read",
  resource: "user",
  title: "List Users",
  description:
    "List the company's Users via the v2 API (v1 is being deprecated). The v2 User carries no " +
    "numbers array — use List User Numbers for that.",
  params: [...windowParams("Users"), ...paginationParams()],
  output: listOutput,

  async execute(input, ctx) {
    const client = new AircallClient(ctx);
    const { meta, items } = await client.list<Record<string, unknown>>("/users", "users", {
      prefix: V2,
      query: { ...windowQuery(input), ...paginationQuery(input) },
    });
    return listResult(meta, items);
  },
};

export default userList;
