import type { ActionDefinition } from "@w6w/types";
import { asOptionalJson, compact, MissiveClient, toIdList } from "../lib/client.ts";

interface Input {
  name: string;
  organization: string;
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
 * `POST /v1/teams` — verified against
 * `missiveapp.com/docs/developers/rest-api/endpoints` §Teams, 2026-08-29.
 * Requires the token belong to an organization admin or owner.
 */
const action: ActionDefinition<Input> = {
  key: "team-create",
  type: "perform",
  resource: "team",
  title: "Create Team",
  description: "Create a team in an organization. Requires an admin or owner token.",
  idempotent: false,
  params: [
    { key: "name", label: "Name", type: "string", required: true },
    { key: "organization", label: "Organization ID", type: "string", required: true },
    { key: "emoji", label: "Emoji", type: "string", default: "", placeholder: ":dart:" },
    { key: "color", label: "Color (HEX)", type: "string", default: "" },
    {
      key: "activeMembers",
      label: "Active Members (comma-separated IDs)",
      type: "string",
      default: "",
      hint: "Get notified for the team inbox and see it in the unified Team Inboxes view.",
    },
    {
      key: "observers",
      label: "Observers (comma-separated IDs)",
      type: "string",
      default: "",
      advanced: true,
      hint: "Can open/manage the team inbox but aren't notified and don't see it unified.",
    },
    {
      key: "businessHours",
      label: "Business Hours (JSON)",
      type: "json",
      default: "",
      advanced: true,
      hint: 'e.g. {"tz":"America/Montreal","t":[{"d":1,"s":[32400,61200]}]} — d: 0=Sunday..' +
        "6=Saturday, s: [startSeconds, endSeconds] from midnight.",
    },
    {
      key: "inactivityPeriod",
      label: "Inactivity Period (seconds)",
      type: "number",
      default: 0,
      advanced: true,
      hint: "Seconds of inactivity before a conversation is considered stale, e.g. 604800 " +
        "(1 week).",
    },
    {
      key: "teamMentionBehavior",
      label: "Team Mention Behavior",
      type: "select",
      default: "only_active_members",
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
      default: "assign_user",
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
      default: "show_in_assignee_inbox",
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
      default: "show_team_space",
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
      default: true,
      advanced: true,
    },
    {
      key: "chatRoomEnabled",
      label: "Chat Room Enabled",
      type: "boolean",
      default: true,
      advanced: true,
    },
  ],
  output: [
    { key: "id", type: "string", label: "Team ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "active_members", type: "array", label: "Active Member IDs" },
  ],

  async execute(input, ctx) {
    if (!input.name) throw new Error("`name` is required");
    if (!input.organization) throw new Error("`organization` is required");

    const team = compact({
      name: input.name,
      organization: input.organization,
      emoji: input.emoji,
      color: input.color,
      active_members: toIdList(input.activeMembers).length
        ? toIdList(input.activeMembers)
        : undefined,
      observers: toIdList(input.observers).length ? toIdList(input.observers) : undefined,
      business_hours: asOptionalJson(input.businessHours, "businessHours"),
      inactivity_period: input.inactivityPeriod || undefined,
      team_mention_behavior: input.teamMentionBehavior,
      user_reply_behavior: input.userReplyBehavior,
      received_reply_behavior: input.receivedReplyBehavior,
      team_sidebar_behavior: input.teamSidebarBehavior,
      team_inbox_enabled: input.teamInboxEnabled,
      chat_room_enabled: input.chatRoomEnabled,
    });

    ctx.log("info", "creating Missive team", {
      name: input.name,
      organization: input.organization,
    });
    const res = await new MissiveClient(ctx).json<{ teams: unknown[] }>("/teams", {
      method: "POST",
      body: { teams: [team] },
    });
    return res.teams[0];
  },
};

export default action;
