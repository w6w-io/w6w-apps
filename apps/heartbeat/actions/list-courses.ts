import type { ActionDefinition } from "@w6w/types";
import { HeartbeatClient } from "../lib/client.ts";

/** `GET /v0/courses` — every course, with its cohorts, modules and lessons. */
const listCourses: ActionDefinition<Record<string, never>> = {
  key: "list-courses",
  type: "read",
  resource: "course",
  title: "List Courses",
  description: "Return every course in the community, including its cohort/module/lesson tree.",
  params: [],
  output: [{ key: "courses", type: "array", label: "Courses" }],

  async execute(_input, ctx) {
    const courses = await new HeartbeatClient(ctx).json("/courses");
    return { courses };
  },
};

export default listCourses;
