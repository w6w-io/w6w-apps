import type { ActionDefinition } from "@w6w/types";
import { TeachableClient } from "../lib/client.ts";

/** `GET /v1/courses/{course_id}/lectures/{lecture_id}/quizzes` — quiz IDs in a lecture. */
interface Input {
  courseId: number;
  lectureId: number;
}

const quizList: ActionDefinition<Input> = {
  key: "quiz-list",
  type: "read",
  resource: "quiz",
  title: "List Quizzes",
  description: "Fetch the IDs of quizzes in a specific course lecture.",
  params: [
    { key: "courseId", label: "Course ID", type: "number", required: true },
    { key: "lectureId", label: "Lecture ID", type: "number", required: true },
  ],
  output: [
    { key: "quiz_ids", type: "array", label: "Quiz IDs" },
  ],

  execute(input, ctx) {
    return new TeachableClient(ctx).json(
      `/courses/${input.courseId}/lectures/${input.lectureId}/quizzes`,
    );
  },
};

export default quizList;
