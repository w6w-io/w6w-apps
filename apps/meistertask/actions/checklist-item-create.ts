import type { ActionDefinition } from "@w6w/types";
import { MeisterTaskClient } from "../lib/client.ts";

/**
 * `POST /checklists/:checklist_id/checklist_items` — add an item to a checklist.
 *
 * **Documentation bug, verified 2026-09-05:** the vendor's own OpenAPI
 * document files this operation under the literal path string
 * `/checklists/:checklist_id/checklist_items` (colon syntax, not the
 * `{checklist_id}` template every sibling operation uses) and declares its
 * only path parameter as `task_id` — which the summary, description and
 * response example all contradict; they are consistently about a
 * *checklist*, not a task, and the vendor's own schema-upload log records
 * exactly this as a validation warning ("has a path parameter named
 * `task_id`, but there is no corresponding `{task_id}` in the path
 * string"). This app calls the conventional REST form,
 * `POST /checklists/{checklist_id}/checklist_items`, matching its `GET`
 * sibling (`checklist-item-list`) and the response shape MeisterTask
 * actually documents.
 */
interface Input {
  checklistId: number;
  name: string;
  sequence?: number;
  status?: number;
}

const checklistItemCreate: ActionDefinition<Input> = {
  key: "checklist-item-create",
  type: "perform",
  resource: "checklist-item",
  title: "Create Checklist Item",
  description: "Add an item to a checklist.",
  idempotent: false,
  params: [
    { key: "checklistId", label: "Checklist ID", type: "number", required: true },
    { key: "name", label: "Name", type: "string", required: true },
    { key: "sequence", label: "Sequence", type: "number" },
    {
      key: "status",
      label: "Status",
      type: "select",
      options: [
        { value: 1, label: "Actionable (default)" },
        { value: 5, label: "Completed" },
      ],
    },
  ],
  output: [
    { key: "id", type: "number", label: "Checklist item ID" },
    { key: "checklist_id", type: "number", label: "Checklist ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "status", type: "number", label: "Status" },
  ],

  execute(input, ctx) {
    return new MeisterTaskClient(ctx).request(
      `/checklists/${input.checklistId}/checklist_items`,
      {
        method: "POST",
        body: { name: input.name, sequence: input.sequence, status: input.status },
      },
    );
  },
};

export default checklistItemCreate;
