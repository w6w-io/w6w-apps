import type { ActionDefinition } from "@w6w/types";
import { CompanyCamClient, type ListPage } from "../lib/client.ts";
import { listOutput } from "../lib/params.ts";

/**
 * `GET /v2/templates/checklists` — the company's checklist templates.
 *
 * Note the path order: `templates/checklists`, not `checklists/templates`.
 *
 * This endpoint accepts **no parameters at all** — no pagination, no filter. It
 * exists to feed `project-checklist-create`, which is the only way to create a
 * checklist, and a template row is just id, name, description and timestamps;
 * the tasks it will produce are not visible until the checklist exists.
 */
type Input = Record<string, never>;

const checklistTemplateList: ActionDefinition<Input, ListPage<Record<string, unknown>>> = {
  key: "checklist-template-list",
  type: "search",
  resource: "checklist",
  title: "List Checklist Templates",
  description: "List the company's checklist templates, for use with Create Project Checklist.",
  params: [],
  output: listOutput,

  execute(_input, ctx) {
    return new CompanyCamClient(ctx).list("/templates/checklists");
  },
};

export default checklistTemplateList;
