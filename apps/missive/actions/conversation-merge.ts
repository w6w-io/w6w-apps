import type { ActionDefinition } from "@w6w/types";
import { compact, MissiveClient, unwrapSingle } from "../lib/client.ts";

interface Input {
  id: string;
  target: string;
  subject?: string;
}

/**
 * `POST /v1/conversations/:id/merge` — verified against
 * `missiveapp.com/docs/developers/rest-api/endpoints` §Conversations,
 * 2026-08-29.
 *
 * Merges the conversation named in `id` (URL) into `target`. Missive warns
 * that conversations can be **swapped** during a merge — e.g. an organization
 * conversation merged into a private one, or a source with far more entries —
 * so the returned id may be neither `id` nor `target` as passed. Not marked
 * idempotent: replaying after a successful merge targets an id that no longer
 * has the entries to merge.
 */
const action: ActionDefinition<Input> = {
  key: "conversation-merge",
  type: "perform",
  resource: "conversation",
  title: "Merge Conversations",
  description: "Merge one conversation into another. All messages, comments, and other entries " +
    "move to the surviving conversation, which is marked as replaced. The surviving " +
    "conversation's ID may differ from either the source or the requested target due to " +
    "internal swapping.",
  idempotent: false,
  params: [
    { key: "id", label: "Source Conversation ID", type: "string", required: true },
    { key: "target", label: "Target Conversation ID", type: "string", required: true },
    { key: "subject", label: "New Subject", type: "string", default: "", advanced: true },
  ],
  output: [
    { key: "id", type: "string", label: "Surviving Conversation ID" },
    { key: "subject", type: "string", label: "Subject" },
  ],

  async execute(input, ctx) {
    if (!input.id) throw new Error("`id` is required");
    if (!input.target) throw new Error("`target` is required");

    ctx.log("info", "merging Missive conversations", { id: input.id, target: input.target });
    const res = await new MissiveClient(ctx).json<{ conversations: unknown }>(
      `/conversations/${encodeURIComponent(input.id)}/merge`,
      { method: "POST", body: compact({ target: input.target, subject: input.subject }) },
    );
    return unwrapSingle(res.conversations);
  },
};

export default action;
