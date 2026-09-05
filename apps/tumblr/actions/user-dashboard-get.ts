import type { ActionDefinition } from "@w6w/types";
import { compact, TumblrClient } from "../lib/client.ts";
import { limitOffsetParams, npfParam } from "../lib/params.ts";

/**
 * `GET /v2/user/dashboard` — the connected account's dashboard feed (posts
 * from blogs it follows). Documented "OAuth" auth level.
 *
 * The vendor's own warning is carried into this action's description
 * verbatim: "Please don't re-implement the Dashboard, and don't recreate
 * complete Tumblr functions or clients" — this action exists for workflows
 * that react to new dashboard activity, not for building a Tumblr client.
 */
interface Input {
  limit?: number;
  offset?: number;
  type?: string;
  sinceId?: number;
  reblogInfo?: boolean;
  notesInfo?: boolean;
  npf?: boolean;
}

const TYPE_OPTIONS = [
  "text",
  "photo",
  "quote",
  "link",
  "chat",
  "audio",
  "video",
  "answer",
].map((v) => ({ value: v, label: v }));

const userDashboardGet: ActionDefinition<Input> = {
  key: "user-dashboard-get",
  type: "read",
  resource: "user",
  title: "Get My Dashboard",
  description:
    "Fetch the connected account's dashboard feed. Do not use this to rebuild a Tumblr " +
    "client — see the vendor's API usage policy.",
  params: [
    ...limitOffsetParams(),
    { key: "type", label: "Post type", type: "select", options: TYPE_OPTIONS },
    {
      key: "sinceId",
      label: "Since post ID",
      type: "number",
      hint: "Page through by passing the last id of the previous page.",
    },
    { key: "reblogInfo", label: "Include reblog info", type: "boolean" },
    { key: "notesInfo", label: "Include notes info", type: "boolean" },
    npfParam,
  ],
  output: [{ key: "posts", type: "array", label: "Dashboard posts" }],

  execute(input, ctx) {
    return new TumblrClient(ctx).data("/user/dashboard", {
      query: compact({
        limit: input.limit,
        offset: input.offset,
        type: input.type,
        since_id: input.sinceId,
        reblog_info: input.reblogInfo ? "true" : undefined,
        notes_info: input.notesInfo ? "true" : undefined,
        npf: input.npf ? "true" : undefined,
      }),
    });
  },
};

export default userDashboardGet;
