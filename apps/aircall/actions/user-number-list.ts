import type { ActionDefinition } from "@w6w/types";
import { AircallClient, encodeId, V2 } from "../lib/client.ts";
import {
  listOutput,
  listResult,
  type PaginationInput,
  paginationParams,
  paginationQuery,
  userIdParam,
} from "../lib/params.ts";

interface Input extends PaginationInput {
  userId: string;
}

/**
 * `GET /v2/users/:id/numbers` — the Numbers a User is assigned to.
 *
 * This endpoint exists only because of what v2 removed: "Please note User v2
 * object doesn't include a numbers object", where the v1 User embedded the full
 * array. So the v2 pairing — Retrieve User for the person, this action for their
 * lines — is the replacement for one v1 call, and code migrated from v1 that
 * reads `user.numbers` will find it absent rather than empty.
 *
 * You need a Number ID from here before Start Outbound Call will work: that
 * endpoint requires the User to be associated with the Number it dials from.
 */
const userNumberList: ActionDefinition<Input> = {
  key: "user-number-list",
  type: "read",
  resource: "user",
  title: "List User Numbers",
  description:
    "List the Numbers a User is assigned to. Needed because the v2 User object drops the numbers " +
    "array, and because Start Outbound Call requires a Number the User is associated with.",
  params: [userIdParam, ...paginationParams()],
  output: listOutput,

  async execute(input, ctx) {
    const client = new AircallClient(ctx);
    const { meta, items } = await client.list<Record<string, unknown>>(
      `/users/${encodeId(input.userId)}/numbers`,
      "numbers",
      { prefix: V2, query: paginationQuery(input) },
    );
    return listResult(meta, items);
  },
};

export default userNumberList;
