import type { ActionDefinition } from "@w6w/types";
import { CannyClient, toList } from "../lib/client.ts";
import { postOutput } from "../lib/output.ts";
import { postIdParam, postStatusParam } from "../lib/params.ts";

/**
 * `POST /v1/posts/change_status` — move a post to a new status, recording a
 * status-change comment at the same time.
 *
 * Every argument here — including `shouldNotifyVoters`, `commentValue` and
 * `commentImageURLs` — carries no "(optional)" marker in Canny's own
 * Arguments table, unlike the truly-optional fields on neighbouring
 * endpoints, so all six are declared required with defaults for the two that
 * have an obviously safe one (no voter notification, no attached images).
 *
 * Not idempotent: `commentValue` attaches a new status-change comment on
 * every call, so retrying after a successful change (rather than after a
 * genuine failure) would leave duplicate comments on the post.
 */
interface Input {
  changerID: string;
  postID: string;
  status: string;
  shouldNotifyVoters: boolean;
  commentValue: string;
  commentImageURLs?: string[] | string;
}

const postChangeStatus: ActionDefinition<Input> = {
  key: "post-change-status",
  type: "perform",
  resource: "post",
  title: "Change Post Status",
  description: "Move a post to a new status, with an attached status-change comment.",
  idempotent: false,
  params: [
    {
      key: "changerID",
      label: "Changed by",
      type: "string",
      required: true,
      hint: "The admin to record as having changed the status. Visible in the post's activity.",
    },
    postIdParam,
    postStatusParam,
    {
      key: "shouldNotifyVoters",
      label: "Notify voters",
      type: "boolean",
      required: true,
      default: false,
      hint: "Whether to email non-admin voters about this status change.",
    },
    {
      key: "commentValue",
      label: "Comment",
      type: "text",
      required: true,
      hint: 'The comment attached to this status change. Use "\\n" for line breaks.',
    },
    {
      key: "commentImageURLs",
      label: "Comment image URLs",
      type: "string",
      repeat: true,
      default: [],
      advanced: true,
    },
  ],
  output: postOutput,

  execute(input, ctx) {
    return new CannyClient(ctx).post("/posts/change_status", {
      changerID: input.changerID,
      postID: input.postID,
      status: input.status,
      shouldNotifyVoters: input.shouldNotifyVoters,
      commentValue: input.commentValue,
      commentImageURLs: toList(input.commentImageURLs) ?? [],
    });
  },
};

export default postChangeStatus;
