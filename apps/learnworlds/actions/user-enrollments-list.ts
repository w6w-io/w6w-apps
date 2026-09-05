import type { ActionDefinition } from "@w6w/types";
import { compact, LearnWorldsClient } from "../lib/client.ts";

/** `GET /v2/users/{id}/courses` — a user's course enrollments, paginated. */
interface Input {
  id: string;
  page?: number;
}

const userEnrollmentsList: ActionDefinition<Input> = {
  key: "user-enrollments-list",
  type: "search",
  resource: "enrollment",
  title: "List a User's Enrollments",
  description: "List the products (courses, bundles, subscriptions) a user is enrolled in.",
  params: [
    { key: "id", label: "User ID or email", type: "string", required: true },
    { key: "page", label: "Page", type: "number", default: 1 },
  ],
  output: [
    { key: "data", type: "array", label: "Enrollments" },
    { key: "meta", type: "object", label: "Pagination metadata" },
  ],

  async execute(input, ctx) {
    return await new LearnWorldsClient(ctx).request(
      `/v2/users/${encodeURIComponent(input.id)}/courses`,
      { query: compact({ page: input.page }) },
    );
  },
};

export default userEnrollmentsList;
