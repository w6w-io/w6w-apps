import type { ActionDefinition } from "@w6w/types";
import { MeisterTaskClient } from "../lib/client.ts";
import { paginationParams, sortParam } from "../lib/params.ts";

/** `GET /checklists/:checklist_id/checklist_items` — the items on a checklist. */
interface Input {
  checklistId: number;
  items?: number;
  page?: number;
  sort?: string;
}

const checklistItemList: ActionDefinition<Input, unknown[]> = {
  key: "checklist-item-list",
  type: "search",
  resource: "checklist-item",
  title: "List Checklist Items",
  description: "List the items on a checklist.",
  params: [
    { key: "checklistId", label: "Checklist ID", type: "number", required: true },
    ...paginationParams,
    sortParam,
  ],
  output: [{ key: "", type: "array", label: "Checklist items" }],

  execute(input, ctx) {
    return new MeisterTaskClient(ctx).request<unknown[]>(
      `/checklists/${input.checklistId}/checklist_items`,
      { query: { items: input.items, page: input.page, sort: input.sort } },
    );
  },
};

export default checklistItemList;
