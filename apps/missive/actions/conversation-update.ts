import type { ActionDefinition } from "@w6w/types";
import { compact, MissiveClient, toIdList, unwrapSingle } from "../lib/client.ts";
import {
  ADD_ASSIGNEES_PARAM,
  ADD_SHARED_LABELS_PARAM,
  ADD_TO_INBOX_PARAM,
  ADD_TO_TEAM_INBOX_PARAM,
  ADD_USERS_PARAM,
  CLOSE_PARAM,
  FORCE_TEAM_PARAM,
  ORGANIZATION_PARAM,
  REMOVE_ASSIGNEES_PARAM,
  REMOVE_SHARED_LABELS_PARAM,
  TEAM_PARAM,
} from "../lib/params.ts";

interface Input {
  id: string;
  subject?: string;
  color?: string;
  reopen?: boolean;
  organization?: string;
  team?: string;
  forceTeam?: boolean;
  addUsers?: string;
  addAssignees?: string;
  removeAssignees?: string;
  addSharedLabels?: string;
  removeSharedLabels?: string;
  addToInbox?: boolean;
  addToTeamInbox?: boolean;
  close?: boolean;
}

/**
 * `PATCH /v1/conversations/:id` — verified against
 * `missiveapp.com/docs/developers/rest-api/endpoints` §Conversations,
 * 2026-08-29.
 *
 * Use this to close, reopen, move, assign, label, recolor, or rename a
 * conversation **without** adding a visible entry. For an action that leaves
 * a trace showing what triggered the change, use Create Post instead — the
 * vendor's own guidance names this as the deliberate difference between the
 * two.
 *
 * Missive's batch form (`PATCH /v1/conversations/:id1,:id2,:id3`) updates
 * several conversations from one request body; this action targets one ID at
 * a time, matching how a single workflow step naturally operates.
 */
const action: ActionDefinition<Input> = {
  key: "conversation-update",
  type: "perform",
  resource: "conversation",
  title: "Update Conversation",
  description:
    "Close, reopen, move, assign, label, recolor, or rename a conversation silently — no post " +
    "is added. Label-change rules still run.",
  idempotent: true,
  params: [
    { key: "id", label: "Conversation ID", type: "string", required: true },
    { key: "subject", label: "New Subject", type: "string", default: "" },
    {
      key: "color",
      label: "Color",
      type: "string",
      default: "",
      hint: 'HEX code, or "good" / "warning" / "danger".',
    },
    ORGANIZATION_PARAM,
    TEAM_PARAM,
    FORCE_TEAM_PARAM,
    ADD_USERS_PARAM,
    ADD_ASSIGNEES_PARAM,
    REMOVE_ASSIGNEES_PARAM,
    ADD_SHARED_LABELS_PARAM,
    REMOVE_SHARED_LABELS_PARAM,
    ADD_TO_INBOX_PARAM,
    ADD_TO_TEAM_INBOX_PARAM,
    CLOSE_PARAM,
    {
      key: "reopen",
      label: "Reopen",
      type: "boolean",
      default: false,
      advanced: true,
    },
  ],
  output: [
    { key: "id", type: "string", label: "Conversation ID" },
    { key: "subject", type: "string", label: "Subject" },
  ],

  async execute(input, ctx) {
    if (!input.id) throw new Error("`id` is required");

    const patch = compact({
      id: input.id,
      subject: input.subject,
      color: input.color,
      organization: input.organization,
      team: input.team,
      force_team: input.forceTeam === true ? true : undefined,
      add_users: toIdList(input.addUsers).length ? toIdList(input.addUsers) : undefined,
      add_assignees: toIdList(input.addAssignees).length ? toIdList(input.addAssignees) : undefined,
      remove_assignees: toIdList(input.removeAssignees).length
        ? toIdList(input.removeAssignees)
        : undefined,
      add_shared_labels: toIdList(input.addSharedLabels).length
        ? toIdList(input.addSharedLabels)
        : undefined,
      remove_shared_labels: toIdList(input.removeSharedLabels).length
        ? toIdList(input.removeSharedLabels)
        : undefined,
      add_to_inbox: input.addToInbox === true ? true : undefined,
      add_to_team_inbox: input.addToTeamInbox === true ? true : undefined,
      close: input.close === true ? true : undefined,
      reopen: input.reopen === true ? true : undefined,
    });

    ctx.log("info", "updating Missive conversation", { id: input.id });
    const res = await new MissiveClient(ctx).json<{ conversations: unknown }>(
      `/conversations/${encodeURIComponent(input.id)}`,
      { method: "PATCH", body: { conversations: [patch] } },
    );
    return unwrapSingle(res.conversations);
  },
};

export default action;
