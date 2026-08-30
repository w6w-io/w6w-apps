import type { ActionDefinition } from "@w6w/types";
import { TeachableClient } from "../lib/client.ts";
import { paginationParams } from "../lib/params.ts";

/** `GET /v1/courses/{course_id}/progress` — a specific user's progress through a course. */
interface Input {
  courseId: number;
  userId: number;
  page?: number;
  per?: number;
}

const courseProgressGet: ActionDefinition<Input> = {
  key: "course-progress-get",
  type: "read",
  resource: "course",
  title: "Get Course Progress",
  description: "Fetch a specific user's progress through a course — completed lecture " +
    "sections, certificate, and overall percent complete.",
  params: [
    { key: "courseId", label: "Course ID", type: "number", required: true },
    { key: "userId", label: "User ID", type: "number", required: true },
    ...paginationParams(20, "Maximum per the endpoint's own docs is 20 when unset."),
  ],
  output: [
    { key: "course_progress", type: "object", label: "Course progress" },
    { key: "meta", type: "object", label: "Pagination metadata" },
  ],

  execute(input, ctx) {
    return new TeachableClient(ctx).json(`/courses/${input.courseId}/progress`, {
      query: { user_id: input.userId, page: input.page, per: input.per ?? 20 },
    });
  },
};

export default courseProgressGet;
