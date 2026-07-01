import type { ActionDefinition } from "@w6w/types";
import { SlackClient } from "../lib/client.ts";

interface Input {
  name: string;
  visibility?: "public" | "private";
}

const channelCreate: ActionDefinition<Input> = {
  key: "channel-create",
  type: "perform",
  resource: "channel",
  title: "Create Channel",
  description: "Creates a new channel (conversations.create). Names starting with # are cleaned.",
  params: [
    { key: "name", label: "Name", type: "string", required: true },
    {
      key: "visibility",
      label: "Visibility",
      type: "select",
      default: "public",
      options: [
        { value: "public", label: "Public" },
        { value: "private", label: "Private" },
      ],
    },
  ],

  async execute(input, ctx) {
    const client = new SlackClient(ctx);
    const name = input.name.startsWith("#") ? input.name.slice(1) : input.name;
    const res = await client.request<{ channel?: unknown }>("/conversations.create", {
      method: "POST",
      body: { name, is_private: input.visibility === "private" },
    });
    return res.channel ?? res;
  },
};

export default channelCreate;
