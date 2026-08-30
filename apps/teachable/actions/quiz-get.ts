import type { ActionDefinition } from "@w6w/types";
import { TeachableClient } from "../lib/client.ts";

/** `GET /v1/courses/{course_id}/lectures/{lecture_id}/quizzes/{quiz_id}` — a quiz's questions. */
interface Input {
  courseId: number;
  lectureId: number;
  quizId: number;
}

const quizGet: ActionDefinition<Input> = {
  key: "quiz-get",
  type: "read",
  resource: "quiz",
  title: "Get Quiz",
  description: "Fetch a specific quiz's questions, answers and correct answers.",
  params: [
    { key: "courseId", label: "Course ID", type: "number", required: true },
    { key: "lectureId", label: "Lecture ID", type: "number", required: true },
    { key: "quizId", label: "Quiz (attachment) ID", type: "number", required: true },
  ],
  output: [
    { key: "id", type: "number", label: "Quiz attachment ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "quiz", type: "object", label: "Quiz questions" },
  ],

  execute(input, ctx) {
    return new TeachableClient(ctx).json(
      `/courses/${input.courseId}/lectures/${input.lectureId}/quizzes/${input.quizId}`,
    );
  },
};

export default quizGet;
