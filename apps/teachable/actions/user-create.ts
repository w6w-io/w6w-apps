import type { ActionDefinition } from "@w6w/types";
import { compact, TeachableClient } from "../lib/client.ts";

/**
 * `POST /v1/users` — create a new user (student by default).
 *
 * Not marked idempotent: Teachable's own docs say creating a user with an
 * email that already exists returns that existing user's enrollments rather
 * than erroring, but do not document what happens to name/password/src on a
 * repeat call — so a retry is not documented as side-effect-free.
 */
interface Input {
  email: string;
  name?: string;
  password?: string;
  src?: string;
}

const userCreate: ActionDefinition<Input> = {
  key: "user-create",
  type: "perform",
  resource: "user",
  title: "Create User",
  description: "Create a new user in the school. Defaults to the student role.",
  idempotent: false,
  params: [
    { key: "email", label: "Email", type: "string", required: true },
    { key: "name", label: "Name", type: "string" },
    {
      key: "password",
      label: "Password",
      type: "secret",
      hint: "At least 6 characters. Leave blank to let the user set their own on first sign-in.",
    },
    {
      key: "src",
      label: "Signup source",
      type: "string",
      hint: "A custom identifier for tracking where this user came from, shown on their " +
        "profile's Information tab.",
    },
  ],
  output: [
    { key: "id", type: "number", label: "User ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "email", type: "string", label: "Email" },
    { key: "role", type: "string", label: "Role" },
  ],

  execute(input, ctx) {
    return new TeachableClient(ctx).json("/users", {
      method: "POST",
      body: compact({
        email: input.email,
        name: input.name,
        password: input.password,
        src: input.src,
      }),
    });
  },
};

export default userCreate;
