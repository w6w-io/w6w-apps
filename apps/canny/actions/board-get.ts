import type { ActionDefinition } from "@w6w/types";
import { CannyClient } from "../lib/client.ts";
import { boardOutput } from "../lib/output.ts";

/** `POST /v1/boards/retrieve` — a single board by id. */
interface Input {
  id: string;
}

const boardGet: ActionDefinition<Input> = {
  key: "board-get",
  type: "read",
  resource: "board",
  title: "Get Board",
  description: "Retrieve a single board by its id.",
  params: [
    {
      key: "id",
      label: "Board",
      type: "string",
      required: true,
      hint: "The board's unique identifier. Take it from a List Boards result.",
    },
  ],
  output: boardOutput,

  execute(input, ctx) {
    return new CannyClient(ctx).post("/boards/retrieve", { id: input.id });
  },
};

export default boardGet;
