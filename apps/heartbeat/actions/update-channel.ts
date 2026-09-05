import type { ActionDefinition } from "@w6w/types";
import { HeartbeatClient, toList } from "../lib/client.ts";

/**
 * `POST /v0/channels/{channelID}` — edit a channel.
 *
 * `restrictedTo` is nullable in the vendor schema: passing an explicit empty
 * selection here (both lists empty) is indistinguishable from "leave
 * unchanged" once serialized, so this action only sends `restrictedTo` when
 * at least one of the two fields is set, and exposes a separate "Make public"
 * switch to send the documented `null` (which is what actually opens the
 * channel back up).
 */
interface Input {
  channelID: string;
  name?: string;
  description?: string;
  isReadOnly?: boolean;
  makePublic?: boolean;
  invitedUsers?: string[] | string;
  invitedGroups?: string[] | string;
}

const updateChannel: ActionDefinition<Input> = {
  key: "update-channel",
  type: "perform",
  resource: "channel",
  title: "Update Channel",
  description: "Edit a channel. All fields are optional; only provided fields change.",
  idempotent: true,
  params: [
    { key: "channelID", label: "Channel ID", type: "string", required: true },
    { key: "name", label: "Name", type: "string" },
    { key: "description", label: "Description", type: "text" },
    { key: "isReadOnly", label: "Read-only", type: "boolean" },
    {
      key: "makePublic",
      label: "Make public",
      type: "boolean",
      hint: "Sends restrictedTo: null, which Heartbeat documents as making the channel public.",
    },
    {
      key: "invitedUsers",
      label: "Restrict to user emails",
      type: "multiselect",
      hint: "Ignored if Make public is on.",
    },
    {
      key: "invitedGroups",
      label: "Restrict to group IDs",
      type: "multiselect",
      hint: "Ignored if Make public is on.",
    },
  ],
  output: [],

  execute(input, ctx) {
    const invitedUsers = toList(input.invitedUsers);
    const invitedGroups = toList(input.invitedGroups);
    const body: Record<string, unknown> = {};
    if (input.name !== undefined) body.name = input.name;
    if (input.description !== undefined) body.description = input.description;
    if (input.isReadOnly !== undefined) body.isReadOnly = input.isReadOnly;
    if (input.makePublic) {
      body.restrictedTo = null;
    } else if (invitedUsers || invitedGroups) {
      body.restrictedTo = { invitedUsers, invitedGroups };
    }
    return new HeartbeatClient(ctx).json(`/channels/${encodeURIComponent(input.channelID)}`, {
      method: "POST",
      body,
    });
  },
};

export default updateChannel;
