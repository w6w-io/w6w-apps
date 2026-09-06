import type { ActionDefinition } from "@w6w/types";
import { compact, csv, MatrixClient } from "../lib/client.ts";

interface Input {
  name?: string;
  topic?: string;
  roomAliasName?: string;
  preset?: string;
  visibility?: string;
  invite?: string;
  isDirect?: boolean;
}

interface Output {
  roomId: string;
}

/**
 * `POST /_matrix/client/v3/createRoom`.
 *
 * `preset` drives the room's `join_rules`/`history_visibility`/`guest_access`
 * in one field, exactly as the spec's own table does — spelling those three
 * out individually would just be re-deriving the preset by hand for the
 * common cases this action targets. `initial_state` (arbitrary extra state
 * events) is left out: it is an escape hatch for state this app's own
 * membership/messaging actions already cover, not a first-version need.
 */
const createRoom: ActionDefinition<Input, Output> = {
  key: "create-room",
  type: "perform",
  title: "Create Room",
  description: "Create a new Matrix room.",
  // Every call creates a distinct room — retrying would create a second one.
  idempotent: false,
  params: [
    { key: "name", label: "Room Name", type: "string" },
    { key: "topic", label: "Topic", type: "string" },
    {
      key: "roomAliasName",
      label: "Room Alias (local part)",
      type: "string",
      hint: 'E.g. "team-updates" becomes "#team-updates:your-homeserver" once created.',
      advanced: true,
    },
    {
      key: "preset",
      label: "Preset",
      type: "select",
      default: "private_chat",
      options: [
        { value: "private_chat", label: "Private chat (invite-only)" },
        {
          value: "trusted_private_chat",
          label: "Trusted private chat (invitees get creator power)",
        },
        { value: "public_chat", label: "Public chat (anyone can join)" },
      ],
    },
    {
      key: "visibility",
      label: "Directory Visibility",
      type: "select",
      default: "private",
      options: [
        { value: "private", label: "Private (not listed)" },
        { value: "public", label: "Public (listed in the room directory)" },
      ],
      advanced: true,
    },
    {
      key: "invite",
      label: "Invite Users",
      type: "string",
      hint:
        "Comma-separated Matrix IDs to invite immediately, e.g. @bob:matrix.org, @carol:matrix.org",
      advanced: true,
    },
    {
      key: "isDirect",
      label: "Direct Message",
      type: "boolean",
      default: false,
      hint: "Flags this as a 1:1 direct message room for the invited users' clients.",
      advanced: true,
    },
  ],
  output: [{ key: "roomId", type: "string", label: "Room ID" }],

  async execute(input, ctx) {
    const client = new MatrixClient(ctx);
    const body = compact({
      name: input.name,
      topic: input.topic,
      room_alias_name: input.roomAliasName,
      preset: input.preset ?? "private_chat",
      visibility: input.visibility ?? "private",
      invite: csv(input.invite),
      is_direct: input.isDirect || undefined,
    });
    const res = await client.request<{ room_id: string }>("/createRoom", {
      method: "POST",
      body,
    });
    return { roomId: res.room_id };
  },
};

export default createRoom;
