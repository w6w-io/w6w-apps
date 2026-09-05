import type { ActionDefinition } from "@w6w/types";
import { compact, encodeId, TumblrClient } from "../lib/client.ts";
import { blogIdentifierParam } from "../lib/params.ts";

/**
 * `GET /v2/blog/{blog-identifier}/notes` — a post's notes (likes, reblogs,
 * replies). Documented "API Key" auth level.
 */
interface Input {
  blogIdentifier: string;
  id: number;
  mode?: string;
  beforeTimestamp?: number;
}

const postNotesList: ActionDefinition<Input> = {
  key: "post-notes-list",
  type: "read",
  resource: "post",
  title: "List Post Notes",
  description: "List the notes (likes, reblogs, replies) for a post.",
  params: [
    blogIdentifierParam,
    { key: "id", label: "Post ID", type: "number", required: true },
    {
      key: "mode",
      label: "Mode",
      type: "select",
      default: "all",
      options: [
        { value: "all", label: "All notes" },
        { value: "likes", label: "Likes only" },
        { value: "conversation", label: "Conversation (replies + reblogs with commentary)" },
        { value: "rollup", label: "Rollup (likes and plain reblogs)" },
        { value: "reblogs_with_tags", label: "Reblogs with tags" },
      ],
    },
    {
      key: "beforeTimestamp",
      label: "Before (timestamp)",
      type: "number",
      hint: "For paging: pass the last note's timestamp from the previous page.",
    },
  ],
  output: [
    { key: "notes", type: "array", label: "Notes" },
    { key: "total_notes", type: "number", label: "Total notes" },
  ],

  execute(input, ctx) {
    return new TumblrClient(ctx).data(`/blog/${encodeId(input.blogIdentifier)}/notes`, {
      query: compact({
        id: input.id,
        mode: input.mode,
        before_timestamp: input.beforeTimestamp,
      }),
    });
  },
};

export default postNotesList;
