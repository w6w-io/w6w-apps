import type { ActionDefinition } from "@w6w/types";
import { TeachableClient } from "../lib/client.ts";

/** `GET /v1/courses/{course_id}/enrollments` — active students and their progress. */
interface Input {
  courseId: number;
  enrolledInAfter?: string;
  enrolledInBefore?: string;
  sortDirection?: "asc" | "desc";
}

const courseEnrollmentsList: ActionDefinition<Input> = {
  key: "course-enrollments-list",
  type: "read",
  resource: "course",
  title: "List Course Enrollments",
  description: "Fetch active enrolled students and their progress for a specific course.",
  params: [
    { key: "courseId", label: "Course ID", type: "number", required: true },
    { key: "enrolledInAfter", label: "Enrolled after", type: "datetime" },
    { key: "enrolledInBefore", label: "Enrolled before", type: "datetime" },
    {
      key: "sortDirection",
      label: "Sort by enrollment date",
      type: "select",
      options: [
        { value: "asc", label: "Ascending (oldest first)" },
        { value: "desc", label: "Descending (newest first)" },
      ],
    },
  ],
  output: [
    { key: "enrollments", type: "array", label: "Enrollments" },
    { key: "meta", type: "object", label: "Pagination metadata" },
  ],

  execute(input, ctx) {
    return new TeachableClient(ctx).json(`/courses/${input.courseId}/enrollments`, {
      query: {
        enrolled_in_after: input.enrolledInAfter,
        enrolled_in_before: input.enrolledInBefore,
        sort_direction: input.sortDirection,
      },
    });
  },
};

export default courseEnrollmentsList;
