import type { ActionDefinition } from "@w6w/types";
import { FreshsalesClient } from "../lib/client.ts";

interface Input {
  filter: string;
  include?: string[];
}

/**
 * `filter` is mandatory and only one value is accepted per request — verified
 * against the docs' own caveat ("you can't get both open and overdue tasks in
 * a single request"). Only `open` appears in a worked `curl` example; the
 * docs' prose additionally describes "due today", "due tomorrow", "overdue"
 * and "completed" filters without showing their wire values in a sample, so
 * this stays a free-text field (defaulted to the one verified value) rather
 * than a select asserting spellings this app can't confirm.
 */
const taskGetMany: ActionDefinition<Input> = {
  key: "task-get-many",
  type: "search",
  resource: "task",
  title: "List Tasks",
  description:
    "List tasks matching one filter (open, overdue, etc). Only `open` is confirmed against a " +
    "worked example in the vendor docs; try other values at your own risk.",
  params: [
    {
      key: "filter",
      label: "Filter",
      type: "string",
      required: true,
      default: "open",
      hint: "Freshsales's own docs list open, due today, due tomorrow, overdue and completed as " +
        "filter concepts, but only `open` is shown in a working example.",
    },
    {
      key: "include",
      label: "Include",
      type: "multiselect",
      advanced: true,
      hint: "Embed additional details in the response.",
      options: [
        { value: "users", label: "Collaborators" },
        { value: "targetable", label: "Attached record" },
        { value: "owner", label: "Owner" },
      ],
    },
  ],
  output: [
    { key: "tasks", type: "array", label: "Tasks" },
    { key: "total", type: "number", label: "Total" },
  ],

  async execute(input, ctx) {
    const { items, total } = await new FreshsalesClient(ctx).list("tasks", "/tasks", {
      query: {
        filter: input.filter,
        include: input.include?.length ? input.include.join(",") : undefined,
      },
    });
    return { tasks: items, total };
  },
};

export default taskGetMany;
