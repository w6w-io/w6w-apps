import type { ActionDefinition } from "@w6w/types";
import { DripClient } from "../lib/client.ts";

interface Input {
  idOrEmail: string;
}

const deleteSubscriber: ActionDefinition<Input> = {
  key: "delete-subscriber",
  type: "perform",
  resource: "subscriber",
  title: "Delete Subscriber",
  description: "Permanently delete a subscriber by id, email, or visitor uuid.",
  // Deleting an already-deleted subscriber is a no-op from the caller's
  // perspective — a retry converges on the same end state.
  idempotent: true,
  params: [
    {
      key: "idOrEmail",
      label: "ID, email, or visitor UUID",
      type: "string",
      required: true,
    },
  ],
  output: [{ key: "success", type: "boolean", label: "Deleted" }],

  async execute(input, ctx) {
    await new DripClient(ctx).request(`/subscribers/${encodeURIComponent(input.idOrEmail)}`, {
      method: "DELETE",
    });
    return { success: true };
  },
};

export default deleteSubscriber;
