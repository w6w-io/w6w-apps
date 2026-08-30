import type { ActionDefinition } from "@w6w/types";
import { TeachableClient } from "../lib/client.ts";

/** `GET /v1/users/{user_id}` — a user and their course enrollments. */
interface Input {
  userId: number;
}

const userGet: ActionDefinition<Input> = {
  key: "user-get",
  type: "read",
  resource: "user",
  title: "Get User",
  description: "Fetch a specific user by ID, including their course enrollments and tags.",
  params: [
    { key: "userId", label: "User ID", type: "number", required: true },
  ],
  output: [
    { key: "id", type: "number", label: "User ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "email", type: "string", label: "Email" },
    { key: "role", type: "string", label: "Role" },
    { key: "courses", type: "array", label: "Course enrollments" },
    { key: "tags", type: "array", label: "Tags" },
  ],

  execute(input, ctx) {
    return new TeachableClient(ctx).json(`/users/${input.userId}`);
  },
};

export default userGet;
