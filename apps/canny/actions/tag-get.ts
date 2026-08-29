import type { ActionDefinition } from "@w6w/types";
import { CannyClient } from "../lib/client.ts";
import { tagOutput } from "../lib/output.ts";

/** `POST /v1/tags/retrieve` — a single tag by id. */
interface Input {
  id: string;
}

const tagGet: ActionDefinition<Input> = {
  key: "tag-get",
  type: "read",
  resource: "tag",
  title: "Get Tag",
  description: "Retrieve a single tag by its id.",
  params: [
    {
      key: "id",
      label: "Tag",
      type: "string",
      required: true,
      hint: "The tag's unique identifier.",
    },
  ],
  output: tagOutput,

  execute(input, ctx) {
    return new CannyClient(ctx).post("/tags/retrieve", { id: input.id });
  },
};

export default tagGet;
