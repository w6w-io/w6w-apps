import type { ActionDefinition } from "@w6w/types";
import { compact, SystemeClient } from "../lib/client.ts";
import { paginationParams } from "../lib/params.ts";

interface Input {
  active?: boolean;
  query?: string;
  limit?: number;
  startingAfter?: number;
  order?: "asc" | "desc";
}

const courseList: ActionDefinition<Input> = {
  key: "course-list",
  type: "read",
  resource: "course",
  title: "List Courses",
  description: "Retrieve the collection of Course resources.",
  params: [
    { key: "active", label: "Active", type: "boolean", hint: "Filter by active state." },
    {
      key: "query",
      label: "Search",
      type: "string",
      hint: "Filter by course, lecture or module name.",
    },
    ...paginationParams(),
  ],
  output: [
    { key: "items", type: "array", label: "Courses" },
    { key: "hasMore", type: "boolean", label: "Whether another page is available" },
  ],

  async execute(input, ctx) {
    return await new SystemeClient(ctx).get("/api/school/courses", compact({ ...input }));
  },
};

export default courseList;
