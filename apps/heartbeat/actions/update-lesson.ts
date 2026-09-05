import type { ActionDefinition } from "@w6w/types";
import { compact, HeartbeatClient } from "../lib/client.ts";

/**
 * `POST /v0/lessons/{lessonID}` — edit a lesson's title, content or publish
 * status.
 *
 * Unlike Create Lesson, `hero` and `communityEmbedCards` are genuinely
 * optional here — this action omits both rather than sending `null`/`[]`, so
 * an existing hero or embed cards on the lesson are left untouched. See
 * `create-lesson.ts` for why this app does not build either field's shape.
 */
interface Input {
  lessonID: string;
  title?: string;
  content?: string;
  publishStatus?: "DRAFT" | "PUBLISH" | "SET_AS_FREE" | "DRIP" | "SCHEDULE_PUBLISH";
  dripDays?: number;
  scheduledPublishAt?: string;
}

function publishStatusBody(input: Input): Record<string, unknown> | undefined {
  if (!input.publishStatus) return undefined;
  if (input.publishStatus === "DRIP") return { type: "DRIP", numDays: input.dripDays };
  if (input.publishStatus === "SCHEDULE_PUBLISH") {
    return { type: "SCHEDULE_PUBLISH", date: input.scheduledPublishAt };
  }
  return { type: input.publishStatus };
}

const updateLesson: ActionDefinition<Input> = {
  key: "update-lesson",
  type: "perform",
  resource: "lesson",
  title: "Update Lesson",
  description:
    "Edit a lesson's title, content or publish status. Only provided fields change; an existing " +
    "video hero or embed cards are left untouched.",
  idempotent: true,
  params: [
    { key: "lessonID", label: "Lesson ID", type: "string", required: true },
    { key: "title", label: "Title", type: "string" },
    { key: "content", label: "Content (Markdown)", type: "text" },
    {
      key: "publishStatus",
      label: "Publish status",
      type: "select",
      options: [
        { value: "DRAFT", label: "Draft" },
        { value: "PUBLISH", label: "Publish immediately" },
        { value: "SET_AS_FREE", label: "Set as free preview" },
        { value: "DRIP", label: "Drip — N days after course start" },
        { value: "SCHEDULE_PUBLISH", label: "Schedule for a future date" },
      ],
    },
    { key: "dripDays", label: "Drip: days after course start", type: "number" },
    { key: "scheduledPublishAt", label: "Scheduled publish date", type: "datetime" },
  ],
  output: [
    { key: "id", type: "string", label: "Lesson ID" },
    { key: "title", type: "string", label: "Title" },
    { key: "content", type: "string", label: "Content" },
  ],

  execute(input, ctx) {
    return new HeartbeatClient(ctx).json(`/lessons/${encodeURIComponent(input.lessonID)}`, {
      method: "POST",
      body: compact({
        title: input.title,
        content: input.content,
        publishStatus: publishStatusBody(input),
      }),
    });
  },
};

export default updateLesson;
