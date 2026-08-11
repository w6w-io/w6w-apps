import type { ActionDefinition } from "@w6w/types";
import { flag, PodioClient, toList } from "../lib/client.ts";
import { pagingParams } from "../lib/params.ts";

/**
 * `GET /task/` — "Returns a list of all tasks matching all given filters and
 * grouped by the specified group."
 *
 * Podio's tasks are a first-class object, not a field on an item: they have
 * their own responsible party, due date, labels and reference. A task can point
 * *at* an item, which is what `reference` filters on.
 *
 * ## `completed` is tri-state and the third state is absence
 *
 * Podio: "True to only return completed tasks, False to return open tasks."
 * Omitting the parameter is neither — it returns both. That is why `completed`
 * has no default here: a prefilled `false` would silently hide completed tasks
 * from a workflow that meant to count everything.
 *
 * ## `view: "full"` changes the shape of every element
 *
 * Podio: "The level of information to return. Setting to `full` will return the
 * full task as specific[ed] on the get task operation." The default is a
 * smaller projection. A workflow reading `description` or `files` off a list
 * element needs this set, and there is no error when it is not — the fields are
 * just absent.
 *
 * Dates are ranges spelled `YYYY-MM-DD-YYYY-MM-DD`, which is Podio's own format
 * and does read as ambiguous until you count the hyphens.
 */
interface Input {
  completed?: boolean;
  responsible?: string[] | string;
  space?: string[] | string;
  org?: string[] | string;
  reference?: string[] | string;
  externalId?: string;
  dueDate?: string;
  createdOn?: string;
  completedOn?: string;
  grouping?: string;
  sortBy?: string;
  sortDesc?: boolean;
  view?: string;
  limit?: number;
  offset?: number;
}

const taskList: ActionDefinition<Input> = {
  key: "task-list",
  type: "search",
  resource: "task",
  title: "List Tasks",
  description: "Tasks matching a set of filters. Leaving “Completed” unset returns both open and " +
    "completed tasks; set View to full for descriptions, files and labels.",
  params: [
    {
      key: "completed",
      label: "Completed",
      type: "boolean",
      hint: "True for completed tasks only, false for open ones only. LEAVE UNSET for both " +
        "— absence is a third state, not the same as false.",
    },
    {
      key: "responsible",
      label: "Responsible user IDs",
      type: "multiselect",
      hint: "User ids. Podio replaces 0 with the connected user's own id.",
    },
    { key: "space", label: "Workspace IDs", type: "multiselect" },
    { key: "org", label: "Organization IDs", type: "multiselect" },
    {
      key: "reference",
      label: "References",
      type: "multiselect",
      placeholder: "item:123456",
      hint: "Each entry is “type:id”, e.g. item:123456 — tasks attached to those objects.",
    },
    { key: "externalId", label: "External ID", type: "string", advanced: true },
    {
      key: "dueDate",
      label: "Due between",
      type: "string",
      placeholder: "2026-01-01-2026-12-31",
      hint: "Podio's range format is YYYY-MM-DD-YYYY-MM-DD — two whole dates, one hyphen " +
        "between them.",
    },
    {
      key: "createdOn",
      label: "Created between",
      type: "string",
      advanced: true,
      placeholder: "2026-01-01-2026-12-31",
    },
    {
      key: "completedOn",
      label: "Completed between",
      type: "string",
      advanced: true,
      placeholder: "2026-01-01-2026-12-31",
    },
    {
      key: "grouping",
      label: "Group by",
      type: "select",
      advanced: true,
      options: ["due_date", "created_by", "responsible", "app", "space", "org"].map((v) => ({
        value: v,
        label: v,
      })),
      validation: { enum: ["due_date", "created_by", "responsible", "app", "space", "org"] },
      hint: "Changes the response into groups rather than a flat list.",
    },
    {
      key: "sortBy",
      label: "Sort by",
      type: "select",
      options: [
        { value: "rank", label: "rank" },
        { value: "created_on", label: "created_on" },
        { value: "completed_on", label: "completed_on" },
      ],
      validation: { enum: ["rank", "created_on", "completed_on"] },
      hint: "Podio's default is rank.",
    },
    { key: "sortDesc", label: "Sort descending", type: "boolean" },
    {
      key: "view",
      label: "Detail level",
      type: "select",
      options: [{ value: "full", label: "full" }],
      validation: { enum: ["full"] },
      hint: "Set to full to get each task's description, files and labels. Podio's default " +
        "projection omits them without saying so.",
    },
    ...pagingParams(30, "Podio documents no default limit on this endpoint; 30 is prefilled."),
  ],
  output: [{ key: "tasks", type: "array", label: "Tasks" }],

  async execute(input, ctx) {
    const tasks = await new PodioClient(ctx).json<unknown[]>("/task/", {
      query: {
        completed: flag(input.completed),
        responsible: toList(input.responsible),
        space: toList(input.space),
        org: toList(input.org),
        reference: toList(input.reference),
        external_id: input.externalId,
        due_date: input.dueDate,
        created_on: input.createdOn,
        completed_on: input.completedOn,
        grouping: input.grouping,
        sort_by: input.sortBy,
        sort_desc: flag(input.sortDesc),
        view: input.view,
        limit: input.limit,
        offset: input.offset,
      },
    });
    return { tasks: tasks ?? [] };
  },
};

export default taskList;
