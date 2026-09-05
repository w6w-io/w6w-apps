import type { ActionDefinition } from "@w6w/types";
import { compact, HeartbeatClient, toList } from "../lib/client.ts";

/** `PUT /v0/voiceChannels` — create a voice channel. */
interface Input {
  name: string;
  description?: string;
  isPrivate?: boolean;
  channelCategoryID: string;
  invitedUsers?: string[] | string;
  invitedGroups?: string[] | string;
}

const createVoiceChannel: ActionDefinition<Input> = {
  key: "create-voice-channel",
  type: "perform",
  resource: "voice-channel",
  title: "Create Voice Channel",
  description: "Create a new voice channel.",
  idempotent: false,
  params: [
    { key: "name", label: "Name", type: "string", required: true },
    { key: "description", label: "Description", type: "text" },
    { key: "isPrivate", label: "Private", type: "boolean" },
    { key: "channelCategoryID", label: "Channel Category ID", type: "string", required: true },
    {
      key: "invitedUsers",
      label: "Invited user emails",
      type: "multiselect",
      hint: "If Private, only these users (plus Invited groups) can access the channel.",
    },
    { key: "invitedGroups", label: "Invited group IDs", type: "multiselect" },
  ],
  output: [],

  execute(input, ctx) {
    return new HeartbeatClient(ctx).json("/voiceChannels", {
      method: "PUT",
      body: compact({
        name: input.name,
        description: input.description,
        isPrivate: input.isPrivate,
        channelCategoryID: input.channelCategoryID,
        invitedUsers: toList(input.invitedUsers),
        invitedGroups: toList(input.invitedGroups),
      }),
    });
  },
};

export default createVoiceChannel;
