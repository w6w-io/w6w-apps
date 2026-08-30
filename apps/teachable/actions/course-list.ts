import type { ActionDefinition } from "@w6w/types";
import { TeachableClient } from "../lib/client.ts";
import { paginationParams } from "../lib/params.ts";

/** `GET /v1/courses` — list courses at the school, with optional filters. */
interface Input {
  name?: string;
  isPublished?: boolean;
  authorBioId?: number;
  createdAt?: string;
  page?: number;
  per?: number;
}

const courseList: ActionDefinition<Input> = {
  key: "course-list",
  type: "read",
  resource: "course",
  title: "List Courses",
  description: "Fetch all courses at your school, with optional name, published-status, " +
    "author and creation-date filters.",
  params: [
    { key: "name", label: "Name contains", type: "string" },
    { key: "isPublished", label: "Published only", type: "boolean" },
    {
      key: "authorBioId",
      label: "Author bio ID",
      type: "number",
      hint: "Filter by a specific course author's bio ID.",
    },
    {
      key: "createdAt",
      label: "Created at",
      type: "datetime",
      hint: "ISO 8601. Filter to courses created at this exact date/time.",
    },
    // The vendor's own docs disagree on the default page size when `per` is
    // left unset — see lib/client.ts — so this action always sends one.
    ...paginationParams(
      20,
      "Teachable's own docs disagree whether the default is 20 or 25; " +
        "this is sent explicitly either way.",
    ),
  ],
  output: [
    { key: "courses", type: "array", label: "Courses" },
    { key: "meta", type: "object", label: "Pagination metadata" },
  ],

  execute(input, ctx) {
    return new TeachableClient(ctx).json("/courses", {
      query: {
        name: input.name,
        is_published: input.isPublished,
        author_bio_id: input.authorBioId,
        created_at: input.createdAt,
        page: input.page,
        per: input.per ?? 20,
      },
    });
  },
};

export default courseList;
