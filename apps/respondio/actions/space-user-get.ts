import type { ActionDefinition } from "@w6w/types";
import { RespondioClient } from "../lib/client.ts";

/** `GET /space/user/{id}` — `SpaceClient.getUser` in the official SDK. */
interface Input {
  id: number;
}

const spaceUserGet: ActionDefinition<Input> = {
  key: "space-user-get",
  type: "read",
  resource: "space",
  title: "Get Workspace User",
  description: "Look up one workspace user by id.",
  params: [
    { key: "id", label: "User ID", type: "number", required: true },
  ],
  output: [
    { key: "id", type: "number", label: "User ID" },
    { key: "firstName", type: "string", label: "First name" },
    { key: "lastName", type: "string", label: "Last name" },
    { key: "email", type: "string", label: "Email" },
    { key: "role", type: "string", label: "Role" },
    { key: "team", type: "object", label: "Team" },
    { key: "restrictions", type: "array", label: "Restrictions" },
  ],

  execute(input, ctx) {
    if (!Number.isFinite(input.id)) throw new Error("User ID is required");
    return new RespondioClient(ctx).get(`/space/user/${input.id}`);
  },
};

export default spaceUserGet;
