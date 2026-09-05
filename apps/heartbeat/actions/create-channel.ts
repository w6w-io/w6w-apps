import type { ActionDefinition } from "@w6w/types";
import { compact, HeartbeatClient, toList } from "../lib/client.ts";

/**
 * `PUT /v0/channels` — create a POSTS (thread) or CHAT channel.
 *
 * Voice channels are a separate resource with their own endpoint — see
 * `create-voice-channel`.
 */
interface Input {
  name: string;
  description?: string;
  isPrivate: boolean;
  channelCategoryID: string;
  invitedUsers?: string[] | string;
  invitedGroups?: string[] | string;
  isReadOnly?: boolean;
  channelType?: string;
}

const createChannel: ActionDefinition<Input> = {
  key: "create-channel",
  type: "perform",
  resource: "channel",
  title: "Create Channel",
  description:
    "Create a new POSTS (thread) or CHAT channel. Thread channels are created by default.",
  idempotent: false,
  params: [
    { key: "name", label: "Name", type: "string", required: true },
    { key: "description", label: "Description", type: "text" },
    { key: "isPrivate", label: "Private", type: "boolean", required: true },
    { key: "channelCategoryID", label: "Channel Category ID", type: "string", required: true },
    {
      key: "invitedUsers",
      label: "Invited user emails",
      type: "multiselect",
      hint: "If Private, only these users (plus Invited groups) can access the channel.",
    },
    { key: "invitedGroups", label: "Invited group IDs", type: "multiselect" },
    {
      key: "isReadOnly",
      label: "Read-only",
      type: "boolean",
      hint: "Only admins/moderators can start threads. Not available for CHAT channels.",
    },
    {
      key: "channelType",
      label: "Channel type",
      type: "select",
      options: [
        { value: "POSTS", label: "Posts (threads) — default" },
        { value: "CHAT", label: "Chat" },
      ],
    },
  ],
  output: [],

  execute(input, ctx) {
    return new HeartbeatClient(ctx).json("/channels", {
      method: "PUT",
      body: compact({
        name: input.name,
        description: input.description,
        isPrivate: input.isPrivate,
        channelCategoryID: input.channelCategoryID,
        invitedUsers: toList(input.invitedUsers),
        invitedGroups: toList(input.invitedGroups),
        isReadOnly: input.isReadOnly,
        channelType: input.channelType,
      }),
    });
  },
};

export default createChannel;
