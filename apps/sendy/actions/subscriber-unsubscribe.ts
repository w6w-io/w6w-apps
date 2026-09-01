import type { ActionDefinition } from "@w6w/types";
import { expectSuccess, sendyPost, UNSUBSCRIBE_PATH } from "../lib/client.ts";

interface Input {
  email: string;
  listId: string;
}

/**
 * `POST /unsubscribe` — unsubscribes an email from a list.
 *
 * Sendy's own docs do not list `api_key` among this endpoint's parameters —
 * unlike every other endpoint in this app, it needs none. This action still
 * runs through a Connection (so the installation URL is known), and the
 * `sign` hook still adds `api_key` to the body as it does for every
 * request; Sendy simply ignores the extra field.
 *
 * Always sent with `boolean=true` for the same reason as `subscribe`: a
 * fixed, predictable success literal (`"true"`) instead of guessing among
 * several possible response shapes.
 */
const subscriberUnsubscribe: ActionDefinition<Input> = {
  key: "subscriber-unsubscribe",
  type: "perform",
  resource: "subscriber",
  title: "Unsubscribe",
  description: "Unsubscribe an email address from a list.",
  idempotent: true,
  params: [
    { key: "email", label: "Email", type: "string", required: true },
    {
      key: "listId",
      label: "List ID",
      type: "string",
      required: true,
      hint: "The encrypted & hashed list id, from View all lists.",
    },
  ],
  output: [{ key: "unsubscribed", type: "boolean", label: "Unsubscribed" }],

  async execute(input, ctx) {
    ctx.log("info", "unsubscribing", { list: input.listId });
    const text = await sendyPost(ctx, UNSUBSCRIBE_PATH, {
      email: input.email,
      list: input.listId,
      boolean: "true",
    });
    expectSuccess(UNSUBSCRIBE_PATH, text, ["true"]);
    return { unsubscribed: true };
  },
};

export default subscriberUnsubscribe;
