import type { ActionDefinition } from "@w6w/types";
import { CannyClient } from "../lib/client.ts";
import { userOutput } from "../lib/output.ts";

/** `POST /v1/users/retrieve` — a single user by Canny id, email, or your application's userID. */
interface Input {
  id?: string;
  email?: string;
  userID?: string;
}

const userGet: ActionDefinition<Input> = {
  key: "user-get",
  type: "read",
  resource: "user",
  title: "Get User",
  description: "Retrieve a single user by Canny id, email, or your application's userID.",
  params: [
    {
      key: "id",
      label: "User ID (Canny)",
      type: "string",
      hint: "The user's unique identifier from Canny.",
    },
    { key: "email", label: "Email", type: "string" },
    {
      key: "userID",
      label: "User ID (yours)",
      type: "string",
      hint: "The user's unique identifier in your application.",
    },
  ],
  output: userOutput,

  execute(input, ctx) {
    return new CannyClient(ctx).post("/users/retrieve", {
      id: input.id,
      email: input.email,
      userID: input.userID,
    });
  },
};

export default userGet;
