import type { ActionDefinition } from "@w6w/types";
import { KustomerClient } from "../lib/client.ts";
import { recordOutput } from "../lib/params.ts";

interface Input {
  id: string;
}

/** `GET /v1/users/{id}` — "Get User by ID", verified against the Access Management OAS. */
const userGet: ActionDefinition<Input> = {
  key: "user-get",
  type: "read",
  resource: "user",
  title: "Get User",
  description: "Fetch one user by their Kustomer ID.",
  params: [{ key: "id", label: "User ID", type: "string", required: true }],
  output: recordOutput,

  execute(input, ctx) {
    return new KustomerClient(ctx).data(`/users/${encodeURIComponent(input.id)}`);
  },
};

export default userGet;
