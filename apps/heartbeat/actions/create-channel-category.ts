import type { ActionDefinition } from "@w6w/types";
import { HeartbeatClient } from "../lib/client.ts";

/** `PUT /v0/channelCategories` — create a new channel category. */
interface Input {
  name: string;
}

const createChannelCategory: ActionDefinition<Input> = {
  key: "create-channel-category",
  type: "perform",
  resource: "channel-category",
  title: "Create Channel Category",
  description: "Create a new channel category.",
  idempotent: false,
  params: [{ key: "name", label: "Name", type: "string", required: true }],
  output: [
    { key: "id", type: "string", label: "Channel category ID" },
    { key: "name", type: "string", label: "Name" },
  ],

  execute(input, ctx) {
    return new HeartbeatClient(ctx).json("/channelCategories", {
      method: "PUT",
      body: { name: input.name },
    });
  },
};

export default createChannelCategory;
