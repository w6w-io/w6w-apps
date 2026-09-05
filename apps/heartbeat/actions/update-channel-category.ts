import type { ActionDefinition } from "@w6w/types";
import { HeartbeatClient } from "../lib/client.ts";

/** `POST /v0/channelCategories/{channelCategoryID}` — rename a channel category. */
interface Input {
  channelCategoryID: string;
  name: string;
}

const updateChannelCategory: ActionDefinition<Input> = {
  key: "update-channel-category",
  type: "perform",
  resource: "channel-category",
  title: "Update Channel Category",
  description: "Rename a channel category.",
  idempotent: true,
  params: [
    { key: "channelCategoryID", label: "Channel Category ID", type: "string", required: true },
    { key: "name", label: "Name", type: "string", required: true },
  ],
  output: [],

  execute(input, ctx) {
    return new HeartbeatClient(ctx).json(
      `/channelCategories/${encodeURIComponent(input.channelCategoryID)}`,
      { method: "POST", body: { name: input.name } },
    );
  },
};

export default updateChannelCategory;
