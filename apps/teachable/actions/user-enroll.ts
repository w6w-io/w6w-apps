import type { ActionDefinition } from "@w6w/types";
import { TeachableClient } from "../lib/client.ts";

/**
 * `POST /v1/enroll` — enroll a user in a course. `204` on success.
 *
 * Marked idempotent: an enrollment is keyed by the (user, course) pair per
 * the `UserEnrollment` schema, so a retried enroll of an already-enrolled
 * pair does not create a second enrollment.
 */
interface Input {
  userId: number;
  courseId: number;
}

const userEnroll: ActionDefinition<Input> = {
  key: "user-enroll",
  type: "perform",
  resource: "enrollment",
  title: "Enroll User",
  description: "Enroll a user in a course.",
  idempotent: true,
  params: [
    { key: "userId", label: "User ID", type: "number", required: true },
    { key: "courseId", label: "Course ID", type: "number", required: true },
  ],
  output: [
    { key: "status", type: "number", label: "HTTP status" },
  ],

  async execute(input, ctx) {
    const status = await new TeachableClient(ctx).status("/enroll", {
      method: "POST",
      body: { user_id: input.userId, course_id: input.courseId },
    });
    return { status };
  },
};

export default userEnroll;
