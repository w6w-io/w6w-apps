import type { ActionDefinition } from "@w6w/types";
import { MeisterTaskClient } from "../lib/client.ts";

/** `GET /sections/:id` — one section's full record. */
interface Input {
  id: number;
}

const sectionGet: ActionDefinition<Input> = {
  key: "section-get",
  type: "read",
  resource: "section",
  title: "Get Section",
  description: "Fetch one section by ID.",
  params: [{ key: "id", label: "Section ID", type: "number", required: true }],
  output: [
    { key: "id", type: "number", label: "Section ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "project_id", type: "number", label: "Project ID" },
    { key: "sequence", type: "number", label: "Sequence" },
  ],

  execute(input, ctx) {
    return new MeisterTaskClient(ctx).request(`/sections/${input.id}`);
  },
};

export default sectionGet;
