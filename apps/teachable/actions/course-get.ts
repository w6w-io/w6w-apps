import type { ActionDefinition } from "@w6w/types";
import { TeachableClient } from "../lib/client.ts";

/** `GET /v1/courses/{course_id}` — a course and its lecture-section curriculum. */
interface Input {
  courseId: number;
}

const courseGet: ActionDefinition<Input> = {
  key: "course-get",
  type: "read",
  resource: "course",
  title: "Get Course",
  description: "Fetch a specific course by ID, including its lecture sections and author bio.",
  params: [
    { key: "courseId", label: "Course ID", type: "number", required: true },
  ],
  output: [
    { key: "course", type: "object", label: "Course" },
  ],

  execute(input, ctx) {
    return new TeachableClient(ctx).json(`/courses/${input.courseId}`);
  },
};

export default courseGet;
