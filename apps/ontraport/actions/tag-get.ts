import type { ActionDefinition } from "@w6w/types";
import { OntraportClient } from "../lib/client.ts";
import { idParam } from "../lib/params.ts";

/** `GET /1/Tag` — a single tag's name and the object type it applies to. */
interface Input {
  id: string;
}

const tagGet: ActionDefinition<Input> = {
  key: "tag-get",
  type: "read",
  resource: "tag",
  title: "Get Tag",
  description: "Fetch a single tag by ID.",
  params: [idParam],
  output: [{ key: "data", type: "object", label: "The tag" }],

  execute(input, ctx) {
    return new OntraportClient(ctx).data("/Tag", { query: { id: input.id } });
  },
};

export default tagGet;
