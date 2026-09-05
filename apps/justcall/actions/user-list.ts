import type { ActionDefinition } from "@w6w/types";
import { JustCallClient } from "../lib/client.ts";
import { ORDER_ASC_DESC, PAGE, PAGINATION_OUTPUT, perPage } from "../lib/params.ts";

/** `GET /v2.1/users` — verified against `users_list_v21`'s OpenAPI fragment, 2026-09-05. */
interface Input {
  available?: boolean;
  email?: string;
  group_id?: number;
  order?: string;
  page?: number;
  per_page?: number;
  role?: string;
}

const userList: ActionDefinition<Input> = {
  key: "user-list",
  type: "search",
  resource: "user",
  title: "List Users",
  description: "Fetch the users (agents) added to the account, optionally filtered.",
  params: [
    { key: "available", label: "Available only", type: "boolean" },
    { key: "email", label: "Email", type: "string" },
    { key: "group_id", label: "User group ID", type: "number" },
    { key: "role", label: "Role", type: "string" },
    ORDER_ASC_DESC,
    PAGE,
    perPage(50, 100),
  ],
  output: PAGINATION_OUTPUT,

  async execute(input, ctx) {
    const client = new JustCallClient(ctx);
    const { body } = await client.json("/users", {
      query: {
        available: input.available,
        email: input.email,
        group_id: input.group_id,
        order: input.order,
        page: input.page,
        per_page: input.per_page,
        role: input.role,
      },
    });
    return body;
  },
};

export default userList;
