import type { ActionDefinition } from "@w6w/types";
import { compact, OpusClipClient } from "../lib/client.ts";

/**
 * `POST /api/publish-schedules` — schedule a clip to publish at a future
 * time.
 *
 * `publishAt` must be a future UTC ISO 8601 timestamp. Same bare-clip-id
 * warning as `post-task-create`. Each X (Twitter) post costs 1 credit.
 *
 * Not idempotent: schedules a new task, every call.
 */
interface Input {
  projectId: string;
  clipId: string;
  postAccountId: string;
  subAccountId?: string;
  publishAt: string;
  title: string;
  mediaType?: string;
  description?: string;
  privacy?: "public" | "private" | "unlisted";
}

const publishScheduleCreate: ActionDefinition<Input> = {
  key: "publish-schedule-create",
  type: "perform",
  resource: "publish-schedule",
  title: "Schedule Post",
  description: "Schedule a clip for future publishing to a connected social account. Each X " +
    "post costs 1 credit.",
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
    {
      key: "publishAt",
      label: "Publish at (UTC ISO 8601)",
      type: "datetime",
      required: true,
      hint: "Must be in the future, e.g. 2026-03-01T16:00:00.000Z.",
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
  output: [{ key: "scheduleId", type: "string", label: "Schedule ID" }],

  async execute(input, ctx) {
    const custom = compact({ description: input.description, privacy: input.privacy });
    const body = compact({
      projectId: input.projectId,
      clipId: input.clipId,
      postAccountId: input.postAccountId,
      subAccountId: input.subAccountId,
      publishAt: input.publishAt,
      postDetail: compact({
        title: input.title,
        mediaType: input.mediaType,
        custom: Object.keys(custom).length > 0 ? custom : undefined,
      }),
    });
    return await new OpusClipClient(ctx).data("/api/publish-schedules", { method: "POST", body });
  },
};

export default publishScheduleCreate;
