import type { ActionDefinition } from "@w6w/types";
import { HeartbeatClient } from "../lib/client.ts";

/**
 * `PUT /v0/lessons` — create a lesson in an existing course cohort/module.
 *
 * Heartbeat's schema marks `hero` (a video hero block) and
 * `communityEmbedCards` as **required** on this call, alongside `title` and
 * `content` — even though `hero` is nullable and `communityEmbedCards` may be
 * an empty array. This action always sends `hero: null` and
 * `communityEmbedCards: []`, satisfying that requirement without attempting
 * to model either union: `hero`'s two video-source shapes and
 * `communityEmbedCards`' six embed-content shapes (channel, post, event,
 * document, a user/group prompt, or a "matchups" card) are more structure
 * than this action can safely build from a flat param form without risking a
 * malformed payload. A lesson created here has no hero and no embed cards; add
 * either by hand in Heartbeat's own editor afterward.
 */
interface Input {
  courseID: string;
  cohortID: string;
  moduleID: string;
  title: string;
  content: string;
  publishStatus: "DRAFT" | "PUBLISH" | "SET_AS_FREE" | "DRIP" | "SCHEDULE_PUBLISH";
  dripDays?: number;
  scheduledPublishAt?: string;
}

function publishStatusBody(input: Input): Record<string, unknown> {
  switch (input.publishStatus) {
    case "DRIP":
      return { type: "DRIP", numDays: input.dripDays };
    case "SCHEDULE_PUBLISH":
      return { type: "SCHEDULE_PUBLISH", date: input.scheduledPublishAt };
    default:
      return { type: input.publishStatus };
  }
}

const createLesson: ActionDefinition<Input> = {
  key: "create-lesson",
  type: "perform",
  resource: "lesson",
  title: "Create Lesson",
  description:
    "Create a lesson (text only — no video hero or embed cards; see this action's own docs for " +
    "why those are left out).",
  idempotent: false,
  params: [
    { key: "courseID", label: "Course ID", type: "string", required: true },
    { key: "cohortID", label: "Cohort ID", type: "string", required: true },
    { key: "moduleID", label: "Module ID", type: "string", required: true },
    { key: "title", label: "Title", type: "string", required: true },
    { key: "content", label: "Content (Markdown)", type: "text", required: true },
    {
      key: "publishStatus",
      label: "Publish status",
      type: "select",
      required: true,
      options: [
        { value: "DRAFT", label: "Draft" },
        { value: "PUBLISH", label: "Publish immediately" },
        { value: "SET_AS_FREE", label: "Set as free preview" },
        { value: "DRIP", label: "Drip — N days after course start" },
        { value: "SCHEDULE_PUBLISH", label: "Schedule for a future date" },
      ],
    },
    {
      key: "dripDays",
      label: "Drip: days after course start",
      type: "number",
      hint: "Only used when Publish status is Drip.",
    },
    {
      key: "scheduledPublishAt",
      label: "Scheduled publish date",
      type: "datetime",
      hint: "Only used when Publish status is Schedule for a future date.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Lesson ID" },
    { key: "title", type: "string", label: "Title" },
    { key: "content", type: "string", label: "Content" },
  ],

  execute(input, ctx) {
    return new HeartbeatClient(ctx).json("/lessons", {
      method: "PUT",
      body: {
        courseID: input.courseID,
        cohortID: input.cohortID,
        moduleID: input.moduleID,
        title: input.title,
        content: input.content,
        hero: null,
        publishStatus: publishStatusBody(input),
        communityEmbedCards: [],
      },
    });
  },
};

export default createLesson;
