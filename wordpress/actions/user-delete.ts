import type { ActionDefinition } from "@w6w/types";
import { WordPressClient } from "../lib/client.ts";

interface Input {
  reassign: string;
}

/**
 * Mirrors n8n's Wordpress node: deletes the currently authenticated user
 * (`/users/me`) with `force=true`. `reassign` names the user ID that should
 * inherit their posts — the WP REST API requires it.
 */
const userDelete: ActionDefinition<Input> = {
  key: "user-delete",
  type: "perform",
  resource: "user",
  title: "Delete User (Me)",
  description:
    "Delete the currently authenticated user. `reassign` names the user to inherit their posts.",
  idempotent: true,
  params: [
    {
      key: "reassign",
      label: "Reassign To (User ID)",
      type: "string",
      required: true,
      hint: "ID of the user to receive the deleted user's posts.",
    },
  ],

  async execute(input, ctx) {
    const client = WordPressClient.fromConnection(ctx);
    return client.request("/users/me", {
      method: "DELETE",
      query: { reassign: input.reassign, force: true },
    });
  },
};

export default userDelete;
