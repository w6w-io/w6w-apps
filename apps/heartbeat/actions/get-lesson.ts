import type { ActionDefinition } from "@w6w/types";
import { HeartbeatClient } from "../lib/client.ts";

/** `GET /v0/lessons/{lessonID}` — a single lesson's content. */
interface Input {
  lessonID: string;
}

const getLesson: ActionDefinition<Input> = {
  key: "get-lesson",
  type: "read",
  resource: "lesson",
  title: "Get Lesson",
  description: "Fetch a single lesson by id.",
  params: [{ key: "lessonID", label: "Lesson ID", type: "string", required: true }],
  output: [
    { key: "id", type: "string", label: "Lesson ID" },
    { key: "title", type: "string", label: "Title" },
    { key: "content", type: "string", label: "Content (Markdown)" },
    { key: "createdAt", type: "string", label: "Created at" },
    { key: "createdBy", type: "string", label: "Author user ID" },
    { key: "communityEmbedCards", type: "array", label: "Embedded cards" },
  ],

  execute(input, ctx) {
    return new HeartbeatClient(ctx).json(`/lessons/${encodeURIComponent(input.lessonID)}`);
  },
};

export default getLesson;
