import type { ActionDefinition } from "@w6w/types";
import { CapsuleClient } from "../lib/client.ts";
import { type PageInput, pageParams, pageQuery } from "../lib/params.ts";

interface Input extends PageInput {
  status?: string[];
  embed?: string[];
}

/**
 * By default Capsule returns only OPEN tasks (`overview` note on
 * `operations/Task#listTasks`) — pending and completed tasks are invisible
 * unless `status` is set explicitly. Easy to miss: a workflow filtering
 * "all tasks" silently gets only the open ones until this is set.
 */
const taskList: ActionDefinition<Input> = {
  key: "task-list",
  type: "read",
  resource: "task",
  title: "List Tasks",
  description: "List tasks. Capsule returns only OPEN tasks unless Status is set.",
  params: [
    {
      key: "status",
      label: "Status",
      type: "multiselect",
      options: [
        { value: "open", label: "Open" },
        { value: "completed", label: "Completed" },
        { value: "pending", label: "Pending" },
      ],
      hint: "Leave blank for Capsule's default: open tasks only.",
    },
    ...pageParams,
    {
      key: "embed",
      label: "Embed",
      type: "multiselect",
      advanced: true,
      options: [
        { value: "party", label: "Party" },
        { value: "opportunity", label: "Opportunity" },
        { value: "kase", label: "Project (case)" },
        { value: "owner", label: "Owner" },
        { value: "nextTask", label: "Next task in track" },
      ],
    },
  ],
  output: [
    { key: "tasks", type: "array", label: "Tasks" },
    { key: "nextPage", type: "number", label: "Next page" },
  ],

  async execute(input, ctx) {
    const { data, nextPage } = await new CapsuleClient(ctx).request<{ tasks: unknown[] }>(
      "/tasks",
      {
        query: {
          ...pageQuery(input),
          status: input.status?.join(","),
          embed: input.embed?.join(","),
        },
      },
    );
    return { tasks: data.tasks, nextPage };
  },
};

export default taskList;
