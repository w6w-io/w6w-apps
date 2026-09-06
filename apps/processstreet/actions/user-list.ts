import type { ActionDefinition } from "@w6w/types";
import { type CursorInput, cursorParams } from "../lib/params.ts";
import { nextCursor, ProcessStreetClient, type PsLink } from "../lib/client.ts";

type Input = CursorInput;

interface User {
  id: string;
  email: string;
  username: string;
}

/** `GET /users` — every user in the organization, 20 at a time, sorted by name. */
interface Output {
  users: User[];
  nextCursor?: string;
}

const userList: ActionDefinition<Input, Output> = {
  key: "user-list",
  type: "read",
  resource: "user",
  title: "List Users",
  description: "List the users in the organization, 20 at a time.",
  params: [...cursorParams],
  output: [
    { key: "users", type: "array", label: "Users" },
    { key: "nextCursor", type: "string", label: "Next cursor" },
  ],

  async execute(input, ctx) {
    const { data } = await new ProcessStreetClient(ctx).request<
      { users: User[]; links?: PsLink[] }
    >("/users", { query: { _: input.cursor } });
    return { users: data.users, nextCursor: nextCursor(data.links) };
  },
};

export default userList;
