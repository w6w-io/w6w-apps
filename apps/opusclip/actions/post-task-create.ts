import type { ActionDefinition } from "@w6w/types";
import { compact, OpusClipClient } from "../lib/client.ts";

/**
 * `POST /api/post-tasks` — publish a clip immediately to a connected social
 * account.
 *
 * `clipId` must be the BARE clip id, same warning as `social-copy-job-create`.
 * Each X (Twitter) post costs 1 credit, per Limitations.
 *
 * Not idempotent: publishes immediately, every call.
 */
interface Input {
  projectId: string;
  clipId: string;
  postAccountId: string;
  subAccountId?: string;
  title: string;
  mediaType?: string;
  description?: string;
  privacy?: "public" | "private" | "unlisted";
}

const postTaskCreate: ActionDefinition<Input> = {
  key: "post-task-create",
  type: "perform",
  resource: "post-task",
  title: "Publish Clip Instantly",
  description: "Publish a clip immediately to a connected social account. Each X post costs 1 " +
    "credit.",
  idempotent: false,
  params: [
    { key: "projectId", label: "Project ID", type: "string", required: true },
    {
      key: "clipId",
      label: "Clip ID",
      type: "string",
      required: true,
      hint: "Bare clip id, e.g. qU3iVMSO77 — not the {projectId}.{clipId} composite form.",
    },
    { key: "postAccountId", label: "Post account ID", type: "string", required: true },
    {
      key: "subAccountId",
      label: "Sub-account ID",
      type: "string",
      hint: "Required for Facebook pages, Instagram business accounts, and LinkedIn.",
    },
    { key: "title", label: "Post title", type: "string", required: true },
    {
      key: "mediaType",
      label: "Media type",
      type: "string",
      advanced: true,
      hint: 'Supported values depend on the connected platform, e.g. "video".',
    },
    { key: "description", label: "Description (incl. hashtags)", type: "text" },
    {
      key: "privacy",
      label: "Privacy (YouTube)",
      type: "select",
      advanced: true,
      options: [
        { value: "public", label: "Public" },
        { value: "private", label: "Private" },
        { value: "unlisted", label: "Unlisted" },
      ],
    },
  ],
  output: [{ key: "postId", type: "string", label: "Post ID" }],

  async execute(input, ctx) {
    const custom = compact({ description: input.description, privacy: input.privacy });
    const body = compact({
      projectId: input.projectId,
      clipId: input.clipId,
      postAccountId: input.postAccountId,
      subAccountId: input.subAccountId,
      postDetail: compact({
        title: input.title,
        mediaType: input.mediaType,
        custom: Object.keys(custom).length > 0 ? custom : undefined,
      }),
    });
    return await new OpusClipClient(ctx).data("/api/post-tasks", { method: "POST", body });
  },
};

export default postTaskCreate;
