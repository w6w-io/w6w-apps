import type { ActionDefinition } from "@w6w/types";
import { asOptionalJson, compact, MissiveClient, toIdList } from "../lib/client.ts";

interface Input {
  id: string;
  name?: string;
  emoji?: string;
  color?: string;
  activeMembers?: string;
  observers?: string;
  businessHours?: unknown;
  inactivityPeriod?: number;
  teamMentionBehavior?: "all_members" | "only_active_members";
  userReplyBehavior?: "assign_user" | "leave_in_team_inbox";
  receivedReplyBehavior?: "show_in_assignee_inbox" | "show_in_team_inbox";
  teamSidebarBehavior?: "show_team_space" | "show_team_inbox";
  teamInboxEnabled?: boolean;
  chatRoomEnabled?: boolean;
}

/**
 * `PATCH /v1/teams/:id` — verified against
 * `missiveapp.com/docs/developers/rest-api/endpoints` §Teams, 2026-08-29.
 * Requires the token belong to an organization admin or owner. Only the
 * fields you set are changed.
 */
const action: ActionDefinition<Input> = {
  key: "team-update",
  type: "perform",
  resource: "team",
  title: "Update Team",
  description: "Update a team. Requires an admin or owner token. Only the fields you set change.",
  idempotent: true,
  params: [
    { key: "id", label: "Team ID", type: "string", required: true },
    { key: "name", label: "Name", type: "string", default: "" },
    { key: "emoji", label: "Emoji", type: "string", default: "" },
    { key: "color", label: "Color (HEX)", type: "string", default: "" },
    {
      key: "activeMembers",
      label: "Active Members (comma-separated IDs)",
      type: "string",
      default: "",
    },
    {
      key: "observers",
      label: "Observers (comma-separated IDs)",
      type: "string",
      default: "",
      advanced: true,
    },
    {
      key: "businessHours",
      label: "Business Hours (JSON)",
      type: "json",
      default: "",
      advanced: true,
    },
    {
      key: "inactivityPeriod",
      label: "Inactivity Period (seconds)",
      type: "number",
      default: 0,
      advanced: true,
    },
    {
      key: "teamMentionBehavior",
      label: "Team Mention Behavior",
      type: "select",
      default: "",
      advanced: true,
      options: [
        { value: "all_members", label: "Notify all members" },
        { value: "only_active_members", label: "Notify only active members" },
      ],
    },
    {
      key: "userReplyBehavior",
      label: "User Reply Behavior",
      type: "select",
      default: "",
      advanced: true,
      options: [
        { value: "assign_user", label: "Assign the replying user" },
        { value: "leave_in_team_inbox", label: "Leave in team inbox" },
      ],
    },
    {
      key: "receivedReplyBehavior",
      label: "Received Reply Behavior",
      type: "select",
      default: "",
      advanced: true,
      options: [
        { value: "show_in_assignee_inbox", label: "Show in assignee's inbox" },
        { value: "show_in_team_inbox", label: "Move back to team inbox" },
      ],
    },
    {
      key: "teamSidebarBehavior",
      label: "Team Sidebar Behavior",
      type: "select",
      default: "",
      advanced: true,
      options: [
        { value: "show_team_space", label: "Show full team space" },
        { value: "show_team_inbox", label: "Show only team inbox" },
      ],
    },
    {
      key: "teamInboxEnabled",
      label: "Team Inbox Enabled",
      type: "boolean",
      default: false,
      advanced: true,
    },
    {
      key: "chatRoomEnabled",
      label: "Chat Room Enabled",
      type: "boolean",
      default: false,
      advanced: true,
    },
  ],
  output: [
    { key: "id", type: "string", label: "Team ID" },
    { key: "name", type: "string", label: "Name" },
  ],

  async execute(input, ctx) {
    if (!input.id) throw new Error("`id` is required");

    const team = compact({
      id: input.id,
      name: input.name,
      emoji: input.emoji,
      color: input.color,
      active_members: toIdList(input.activeMembers).length
        ? toIdList(input.activeMembers)
        : undefined,
      observers: toIdList(input.observers).length ? toIdList(input.observers) : undefined,
      business_hours: asOptionalJson(input.businessHours, "businessHours"),
      inactivity_period: input.inactivityPeriod || undefined,
      team_mention_behavior: input.teamMentionBehavior || undefined,
      user_reply_behavior: input.userReplyBehavior || undefined,
      received_reply_behavior: input.receivedReplyBehavior || undefined,
      team_sidebar_behavior: input.teamSidebarBehavior || undefined,
      team_inbox_enabled: input.teamInboxEnabled === true ? true : undefined,
      chat_room_enabled: input.chatRoomEnabled === true ? true : undefined,
    });

    ctx.log("info", "updating Missive team", { id: input.id });
    const res = await new MissiveClient(ctx).json<{ teams: unknown[] }>(
      `/teams/${encodeURIComponent(input.id)}`,
      { method: "PATCH", body: { teams: [team] } },
    );
    return res.teams[0];
  },
};

export default action;
