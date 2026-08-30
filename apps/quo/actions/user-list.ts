import type { ActionDefinition } from "@w6w/types";
import { QuoClient } from "../lib/client.ts";
import { maxResultsParam, pageTokenParam, paginationOutputFields } from "../lib/params.ts";

/** `GET /v1/users` — paginated list of workspace members. */
interface Input {
  maxResults?: number;
  pageToken?: string;
}

const userList: ActionDefinition<Input> = {
  key: "user-list",
  type: "search",
  resource: "user",
  title: "List Users",
  description: "Retrieve a paginated list of users in the Quo workspace.",
  params: [maxResultsParam({ required: false }), pageTokenParam],
  output: [
    {
      key: "data",
      type: "array",
      label: "Users (id, email, firstName, lastName, pictureUrl, role, createdAt, updatedAt)",
    },
    ...paginationOutputFields,
  ],

  execute(input, ctx) {
    return new QuoClient(ctx).json("/users", {
      query: { maxResults: input.maxResults, pageToken: input.pageToken },
    });
  },
};

export default userList;
