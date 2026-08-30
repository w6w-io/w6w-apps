import type { ActionDefinition } from "@w6w/types";
import { compact, TeachableClient } from "../lib/client.ts";

/**
 * `PATCH /v1/users/{user_id}` — update a user's name or signup source. Neither
 * field is required by the vendor's own `UpdateUserRequest` schema, so at
 * least one is enforced here rather than sending an empty, no-op PATCH.
 *
 * Idempotent: a PATCH that sets the same fields to the same values is a pure
 * overwrite either way, safe to retry.
 */
interface Input {
  userId: number;
  name?: string;
  src?: string;
}

const userUpdate: ActionDefinition<Input> = {
  key: "user-update",
  type: "perform",
  resource: "user",
  title: "Update User",
  description: "Update a user's name and/or signup source.",
  idempotent: true,
  params: [
    { key: "userId", label: "User ID", type: "number", required: true },
    { key: "name", label: "Name", type: "string" },
    { key: "src", label: "Signup source", type: "string" },
  ],
  output: [
    { key: "id", type: "number", label: "User ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "email", type: "string", label: "Email" },
  ],

  execute(input, ctx) {
    const body = compact({ name: input.name, src: input.src });
    if (Object.keys(body).length === 0) {
      throw new Error("Set at least one of Name or Signup source");
    }
    return new TeachableClient(ctx).json(`/users/${input.userId}`, { method: "PATCH", body });
  },
};

export default userUpdate;
