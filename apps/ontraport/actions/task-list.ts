import type { ActionDefinition } from "@w6w/types";
import { OntraportClient } from "../lib/client.ts";
import { type CollectionInput, collectionParams, collectionQuery } from "../lib/params.ts";

/** `GET /1/Tasks` — a collection of tasks. */
type Input = CollectionInput;

const taskList: ActionDefinition<Input> = {
  key: "task-list",
  type: "search",
  resource: "task",
  title: "List Tasks",
  description: "Retrieve a collection of tasks, filtered, sorted and paginated.",
  params: collectionParams,
  output: [{ key: "items", type: "array", label: "Tasks" }],

  async execute(input, ctx) {
    const { items, count } = await new OntraportClient(ctx).list("/Tasks", {
      query: collectionQuery(input),
    });
    return { items, count };
  },
};

export default taskList;
