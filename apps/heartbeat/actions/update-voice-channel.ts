import type { ActionDefinition } from "@w6w/types";
import { HeartbeatClient, toList } from "../lib/client.ts";

/**
 * `POST /v0/voiceChannels/{voiceChannelID}` — edit a voice channel.
 *
 * Same `restrictedTo: null` nullability as `update-channel` — see that
 * action's docs for why "make public" is its own switch.
 */
interface Input {
  voiceChannelID: string;
  name?: string;
  description?: string;
  makePublic?: boolean;
  invitedUsers?: string[] | string;
  invitedGroups?: string[] | string;
}

const updateVoiceChannel: ActionDefinition<Input> = {
  key: "update-voice-channel",
  type: "perform",
  resource: "voice-channel",
  title: "Update Voice Channel",
  description: "Edit a voice channel. All fields are optional; only provided fields change.",
  idempotent: true,
  params: [
    { key: "voiceChannelID", label: "Voice Channel ID", type: "string", required: true },
    { key: "name", label: "Name", type: "string" },
    { key: "description", label: "Description", type: "text" },
    {
      key: "makePublic",
      label: "Make public",
      type: "boolean",
      hint: "Sends restrictedTo: null, which Heartbeat documents as making the channel public.",
    },
    { key: "invitedUsers", label: "Restrict to user emails", type: "multiselect" },
    { key: "invitedGroups", label: "Restrict to group IDs", type: "multiselect" },
  ],
  output: [],

  execute(input, ctx) {
    const invitedUsers = toList(input.invitedUsers);
    const invitedGroups = toList(input.invitedGroups);
    const body: Record<string, unknown> = {};
    if (input.name !== undefined) body.name = input.name;
    if (input.description !== undefined) body.description = input.description;
    if (input.makePublic) {
      body.restrictedTo = null;
    } else if (invitedUsers || invitedGroups) {
      body.restrictedTo = { invitedUsers, invitedGroups };
    }
    return new HeartbeatClient(ctx).json(
      `/voiceChannels/${encodeURIComponent(input.voiceChannelID)}`,
      {
        method: "POST",
        body,
      },
    );
  },
};

export default updateVoiceChannel;
