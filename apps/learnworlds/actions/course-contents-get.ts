import type { ActionDefinition } from "@w6w/types";
import { LearnWorldsClient } from "../lib/client.ts";

/**
 * `GET /v2/courses/{id}/contents` — the course's sections and learning units
 * (pdf, url, scorm, certificate, …). Read-only: creating course content is
 * out of scope, the same way `mautic` leaves its campaign builder alone.
 */
interface Input {
  id: string;
}

const courseContentsGet: ActionDefinition<Input> = {
  key: "course-contents-get",
  type: "read",
  resource: "course",
  title: "Get Course Contents",
  description: "Get a course's sections and learning units.",
  params: [
    {
      key: "id",
      label: "Course ID",
      type: "string",
      required: true,
      hint: "The course's titleId.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "ID" },
    { key: "title", type: "string", label: "Title" },
    { key: "sections", type: "array", label: "Sections" },
  ],

  async execute(input, ctx) {
    return await new LearnWorldsClient(ctx).request(
      `/v2/courses/${encodeURIComponent(input.id)}/contents`,
    );
  },
};

export default courseContentsGet;
