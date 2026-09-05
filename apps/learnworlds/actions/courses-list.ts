import type { ActionDefinition } from "@w6w/types";
import { compact, csv, LearnWorldsClient } from "../lib/client.ts";

/**
 * `GET /v2/courses` — the school's courses, newest first.
 *
 * Paginated at a fixed 50 per page (not adjustable — LearnWorlds' own docs
 * state this endpoint's page size is fixed, unlike `/v2/users`, which takes
 * `items_per_page`).
 */
interface Input {
  categories?: string;
  access?: string;
  page?: number;
}

const coursesList: ActionDefinition<Input> = {
  key: "courses-list",
  type: "search",
  resource: "course",
  title: "List Courses",
  description: "List the school's courses, most recently created first.",
  params: [
    {
      key: "categories",
      label: "Categories",
      type: "string",
      hint: "Comma-separated course categories to filter by.",
    },
    {
      key: "access",
      label: "Access",
      type: "select",
      options: [
        { label: "Paid", value: "paid" },
        { label: "Free", value: "free" },
        { label: "Coming soon", value: "coming_soon" },
        { label: "Private", value: "private" },
        { label: "Draft", value: "draft" },
        { label: "Enrollment closed", value: "enrollment_closed" },
      ],
      hint: "Filter by course access type.",
    },
    { key: "page", label: "Page", type: "number", default: 1 },
  ],
  output: [
    { key: "data", type: "array", label: "Courses" },
    { key: "meta", type: "object", label: "Pagination metadata" },
  ],

  async execute(input, ctx) {
    return await new LearnWorldsClient(ctx).request("/v2/courses", {
      query: compact({
        categories: csv(input.categories)?.join(","),
        access: input.access,
        page: input.page,
      }),
    });
  },
};

export default coursesList;
