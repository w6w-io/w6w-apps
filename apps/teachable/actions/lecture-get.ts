import type { ActionDefinition } from "@w6w/types";
import { TeachableClient } from "../lib/client.ts";

/** `GET /v1/courses/{course_id}/lectures/{lecture_id}` — a lecture and its attachments. */
interface Input {
  courseId: number;
  lectureId: number;
}

const lectureGet: ActionDefinition<Input> = {
  key: "lecture-get",
  type: "read",
  resource: "lecture",
  title: "Get Lecture",
  description: "Fetch a specific course lecture, including its attachments (text, video, " +
    "quiz, etc.).",
  params: [
    { key: "courseId", label: "Course ID", type: "number", required: true },
    { key: "lectureId", label: "Lecture ID", type: "number", required: true },
  ],
  output: [
    { key: "lecture", type: "object", label: "Lecture" },
  ],

  execute(input, ctx) {
    return new TeachableClient(ctx).json(`/courses/${input.courseId}/lectures/${input.lectureId}`);
  },
};

export default lectureGet;
