import type { ActionDefinition } from "@w6w/types";
import { compact, SystemeClient } from "../lib/client.ts";
import { paginationParams } from "../lib/params.ts";

interface Input {
  course?: string;
  contact?: string;
  limit?: number;
  startingAfter?: number;
  order?: "asc" | "desc";
}

const enrollmentList: ActionDefinition<Input> = {
  key: "enrollment-list",
  type: "read",
  resource: "enrollment",
  title: "List Enrollments",
  description: "Retrieve the collection of Enrollment resources.",
  params: [
    { key: "course", label: "Course", type: "string", hint: "Filter by course id." },
    { key: "contact", label: "Contact", type: "string", hint: "Filter by contact id." },
    ...paginationParams(),
  ],
  output: [
    { key: "items", type: "array", label: "Enrollments" },
    { key: "hasMore", type: "boolean", label: "Whether another page is available" },
  ],

  async execute(input, ctx) {
    return await new SystemeClient(ctx).get("/api/school/enrollments", compact({ ...input }));
  },
};

export default enrollmentList;
