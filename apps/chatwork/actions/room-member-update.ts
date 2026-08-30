import type { ActionDefinition } from "@w6w/types";
import { ChatworkClient } from "../lib/client.ts";
import { roomIdParam, toCsv } from "../lib/params.ts";

interface Input {
  roomId: string;
  membersAdminIds: string;
  membersMemberIds?: string;
  membersReadonlyIds?: string;
}

/**
 * `PUT /rooms/{room_id}/members` — replace a chat's whole member list.
 *
 * This is a **full replace**, not a delta: every account not listed in one of
 * the three role fields is removed from the chat. `members_admin_ids` is
 * required and must name at least one account.
 */
const roomMemberUpdate: ActionDefinition<Input> = {
  key: "room-member-update",
  type: "perform",
  resource: "member",
  title: "Replace Chat Members",
  description:
    "Replace a chat's entire member list. Any current member not included in one of the three " +
    "role lists is removed from the chat.",
  idempotent: true,
  params: [
    roomIdParam,
    {
      key: "membersAdminIds",
      label: "Administrators (Account IDs)",
      type: "string",
      required: true,
      hint: "Comma-separated account IDs. At least one is required.",
    },
    { key: "membersMemberIds", label: "Members (Account IDs)", type: "string" },
    { key: "membersReadonlyIds", label: "Read-only members (Account IDs)", type: "string" },
  ],
  output: [
    { key: "admin", type: "array", label: "Resulting administrator account IDs" },
    { key: "member", type: "array", label: "Resulting member account IDs" },
    { key: "readonly", type: "array", label: "Resulting read-only account IDs" },
  ],

  execute(input, ctx) {
    return new ChatworkClient(ctx).json(`/rooms/${encodeURIComponent(input.roomId)}/members`, {
      method: "PUT",
      form: {
        members_admin_ids: toCsv(input.membersAdminIds),
        members_member_ids: toCsv(input.membersMemberIds),
        members_readonly_ids: toCsv(input.membersReadonlyIds),
      },
    });
  },
};

export default roomMemberUpdate;
