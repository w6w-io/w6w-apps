import type { ActionDefinition } from "@w6w/types";
import { MeisterTaskClient } from "../lib/client.ts";

/**
 * `PUT /sections/:id` — rename a section or move it to/from the trash.
 *
 * The vendor's own documented example response for this endpoint is `{}` —
 * unlike every other `PUT`, it does not echo the updated record — so
 * `output` is left empty rather than guessed.
 */
interface Input {
  id: number;
  name?: string;
  status?: number;
}

const sectionUpdate: ActionDefinition<Input> = {
  key: "section-update",
  type: "perform",
  resource: "section",
  title: "Update Section",
  description: "Rename a section, or move it to/from the trash.",
  idempotent: true,
  params: [
    { key: "id", label: "Section ID", type: "number", required: true },
    { key: "name", label: "Name", type: "string" },
    {
      key: "status",
      label: "Status",
      type: "select",
      options: [
        { value: 1, label: "Active" },
        { value: 2, label: "Trashed" },
      ],
    },
  ],
  output: [],

  execute(input, ctx) {
    return new MeisterTaskClient(ctx).request(`/sections/${input.id}`, {
      method: "PUT",
      body: { name: input.name, status: input.status },
    });
  },
};

export default sectionUpdate;
