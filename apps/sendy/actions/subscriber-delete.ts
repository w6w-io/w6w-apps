import type { ActionDefinition } from "@w6w/types";
import { DELETE_SUBSCRIBER_PATH, expectSuccess, sendyPost } from "../lib/client.ts";

interface Input {
  email: string;
  listId: string;
}

/** `POST /api/subscribers/delete.php` — removes a subscriber from a list. */
const subscriberDelete: ActionDefinition<Input> = {
  key: "subscriber-delete",
  type: "perform",
  resource: "subscriber",
  title: "Delete Subscriber",
  description: "Delete a subscriber off a list.",
  idempotent: true,
  params: [
    { key: "email", label: "Email", type: "string", required: true },
    {
      key: "listId",
      label: "List ID",
      type: "string",
      required: true,
      hint: "The encrypted list id, from View all lists.",
    },
  ],
  output: [{ key: "deleted", type: "boolean", label: "Deleted" }],

  async execute(input, ctx) {
    ctx.log("info", "deleting subscriber", { list: input.listId });
    const text = await sendyPost(ctx, DELETE_SUBSCRIBER_PATH, {
      list_id: input.listId,
      email: input.email,
    });
    expectSuccess(DELETE_SUBSCRIBER_PATH, text, ["true"]);
    return { deleted: true };
  },
};

export default subscriberDelete;
