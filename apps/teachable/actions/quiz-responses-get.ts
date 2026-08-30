import type { ActionDefinition } from "@w6w/types";
import { TeachableClient } from "../lib/client.ts";

/** `GET /v1/courses/{course_id}/lectures/{lecture_id}/quizzes/{quiz_id}/responses` — student answers. */
interface Input {
  courseId: number;
  lectureId: number;
  quizId: number;
}

const quizResponsesGet: ActionDefinition<Input> = {
  key: "quiz-responses-get",
  type: "read",
  resource: "quiz",
  title: "Get Quiz Responses",
  description: "Fetch every student's submission for a specific quiz, with percent correct.",
  params: [
    { key: "courseId", label: "Course ID", type: "number", required: true },
    { key: "lectureId", label: "Lecture ID", type: "number", required: true },
    { key: "quizId", label: "Quiz (attachment) ID", type: "number", required: true },
  ],
  output: [
    { key: "course_id", type: "number", label: "Course ID" },
    { key: "lecture_id", type: "number", label: "Lecture ID" },
    { key: "graded", type: "boolean", label: "Whether the quiz is graded" },
    { key: "responses", type: "array", label: "Student responses" },
  ],

  execute(input, ctx) {
    return new TeachableClient(ctx).json(
      `/courses/${input.courseId}/lectures/${input.lectureId}/quizzes/${input.quizId}/responses`,
    );
  },
};

export default quizResponsesGet;
