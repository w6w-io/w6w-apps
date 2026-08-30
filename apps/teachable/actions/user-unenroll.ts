import type { ActionDefinition } from "@w6w/types";
import { TeachableClient } from "../lib/client.ts";

/**
 * `POST /v1/unenroll` — unenroll a user from a course. `204` on success.
 *
 * Marked idempotent: unenrolling an already-unenrolled (user, course) pair is
 * a no-op end state, safe to retry.
 */
interface Input {
  userId: number;
  courseId: number;
}

const userUnenroll: ActionDefinition<Input> = {
  key: "user-unenroll",
  type: "perform",
  resource: "enrollment",
  title: "Unenroll User",
  description: "Unenroll a user from a course.",
  idempotent: true,
  params: [
    { key: "userId", label: "User ID", type: "number", required: true },
    { key: "courseId", label: "Course ID", type: "number", required: true },
  ],
  output: [
    { key: "status", type: "number", label: "HTTP status" },
  ],

  async execute(input, ctx) {
    const status = await new TeachableClient(ctx).status("/unenroll", {
      method: "POST",
      body: { user_id: input.userId, course_id: input.courseId },
    });
    return { status };
  },
};

export default userUnenroll;
