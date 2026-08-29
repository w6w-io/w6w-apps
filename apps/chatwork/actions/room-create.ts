import type { ActionDefinition } from "@w6w/types";
import { ChatworkClient, flag } from "../lib/client.ts";
import { roomIconPresetOptions, toCsv } from "../lib/params.ts";

interface Input {
  name: string;
  membersAdminIds: string;
  membersMemberIds?: string;
  membersReadonlyIds?: string;
  description?: string;
  createLink?: boolean;
  linkCode?: string;
  linkNeedAcceptance?: boolean;
  iconPreset?: string;
}

/**
 * `POST /rooms` — create a new group chat.
 *
 * Chatwork requires at least one administrator besides the creator:
 * `members_admin_ids` is required by the spec, and creating a chat does not
 * implicitly add the caller as a member the way some platforms do.
 */
const roomCreate: ActionDefinition<Input> = {
  key: "room-create",
  type: "perform",
  resource: "room",
  title: "Create Chat",
  description: "Create a new group chat.",
  idempotent: false,
  params: [
    { key: "name", label: "Name", type: "string", required: true, validation: { maxLength: 255 } },
    {
      key: "membersAdminIds",
      label: "Administrators (Account IDs)",
      type: "string",
      required: true,
      hint:
        "Comma-separated account IDs of contacted or same-organization accounts. At least one " +
        "is required.",
    },
    {
      key: "membersMemberIds",
      label: "Members (Account IDs)",
      type: "string",
      hint: "Comma-separated account IDs to add with the Member role.",
    },
    {
      key: "membersReadonlyIds",
      label: "Read-only members (Account IDs)",
      type: "string",
      hint: "Comma-separated account IDs to add with the Read-only role.",
    },
    { key: "description", label: "Description", type: "text" },
    { key: "createLink", label: "Create an invite link", type: "boolean", default: false },
    {
      key: "linkCode",
      label: "Invite link path",
      type: "string",
      hint: "Only used when Create an invite link is on. Leave empty for a random string.",
      validation: { maxLength: 50, pattern: "^[A-Za-z0-9_-]+$" },
    },
    {
      key: "linkNeedAcceptance",
      label: "Invite link requires admin approval to join",
      type: "boolean",
      default: true,
    },
    { key: "iconPreset", label: "Icon", type: "select", options: roomIconPresetOptions },
  ],
  output: [{ key: "room_id", type: "number", label: "New room ID" }],

  execute(input, ctx) {
    return new ChatworkClient(ctx).json("/rooms", {
      method: "POST",
      form: {
        name: input.name,
        description: input.description,
        link: flag(input.createLink),
        link_code: input.linkCode,
        link_need_acceptance: input.linkNeedAcceptance === false ? "0" : undefined,
        members_admin_ids: toCsv(input.membersAdminIds),
        members_member_ids: toCsv(input.membersMemberIds),
        members_readonly_ids: toCsv(input.membersReadonlyIds),
        icon_preset: input.iconPreset,
      },
    });
  },
};

export default roomCreate;
