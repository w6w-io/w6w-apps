import type { ActionDefinition } from "@w6w/types";
import { TeachableClient } from "../lib/client.ts";

/**
 * `POST /v1/courses/{course_id}/lectures/{lecture_id}/mark_complete` — mark a
 * lecture complete for a given user. Answers `204` with no body on success,
 * `409` if the lecture is already marked complete for that user.
 *
 * Marked idempotent: re-marking an already-completed lecture is a documented
 * `409`, not a second completion event — a retry either succeeds once or fails
 * harmlessly, never doubles the effect.
 */
interface Input {
  courseId: number;
  lectureId: number;
  userId: number;
}

const lectureMarkComplete: ActionDefinition<Input> = {
  key: "lecture-mark-complete",
  type: "perform",
  resource: "lecture",
  title: "Mark Lecture Complete",
  description: "Mark a specific course lecture as complete for a user.",
  idempotent: true,
  params: [
    { key: "courseId", label: "Course ID", type: "number", required: true },
    { key: "lectureId", label: "Lecture ID", type: "number", required: true },
    { key: "userId", label: "User ID", type: "number", required: true },
  ],
  output: [
    { key: "status", type: "number", label: "HTTP status" },
  ],

  async execute(input, ctx) {
    const status = await new TeachableClient(ctx).status(
      `/courses/${input.courseId}/lectures/${input.lectureId}/mark_complete`,
      { method: "POST", body: { user_id: input.userId } },
    );
    return { status };
  },
};

export default lectureMarkComplete;
