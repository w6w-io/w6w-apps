import type { ActionDefinition } from "@w6w/types";
import { CannyClient } from "../lib/client.ts";
import { voteOutput } from "../lib/output.ts";

/** `POST /v1/votes/retrieve` — a single vote by id. */
interface Input {
  id: string;
}

const voteGet: ActionDefinition<Input> = {
  key: "vote-get",
  type: "read",
  resource: "vote",
  title: "Get Vote",
  description: "Retrieve a single vote by its id.",
  params: [
    {
      key: "id",
      label: "Vote",
      type: "string",
      required: true,
      hint: "The vote's unique identifier.",
    },
  ],
  output: voteOutput,

  execute(input, ctx) {
    return new CannyClient(ctx).post("/votes/retrieve", { id: input.id });
  },
};

export default voteGet;
