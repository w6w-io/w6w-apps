import type { ActionDefinition } from "@w6w/types";
import { LearnWorldsClient } from "../lib/client.ts";

/** `GET /v2/courses/{id}` — a single course by its title id. */
interface Input {
  id: string;
}

const courseGet: ActionDefinition<Input> = {
  key: "course-get",
  type: "read",
  resource: "course",
  title: "Get a Course",
  description: "Get a single course by its id (titleId).",
  params: [
    {
      key: "id",
      label: "Course ID",
      type: "string",
      required: true,
      hint: 'The course\'s titleId, e.g. "10-secrets-of-sleep-walking".',
    },
  ],
  output: [
    { key: "id", type: "string", label: "ID" },
    { key: "title", type: "string", label: "Title" },
    { key: "access", type: "string", label: "Access" },
    { key: "final_price", type: "number", label: "Final price" },
  ],

  async execute(input, ctx) {
    return await new LearnWorldsClient(ctx).request(
      `/v2/courses/${encodeURIComponent(input.id)}`,
    );
  },
};

export default courseGet;
