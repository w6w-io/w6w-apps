import type { ActionDefinition } from "@w6w/types";
import { OBJECT_TYPE, OntraportClient } from "../lib/client.ts";
import { idParam } from "../lib/params.ts";

/** `GET /1/object?objectID=5&id=...` — a single sequence. See `sequence-list.ts`. */
interface Input {
  id: string;
}

const sequenceGet: ActionDefinition<Input> = {
  key: "sequence-get",
  type: "read",
  resource: "sequence",
  title: "Get Sequence",
  description: "Fetch a single sequence by ID via the generic Objects endpoint.",
  params: [idParam],
  output: [{ key: "data", type: "object", label: "The sequence" }],

  execute(input, ctx) {
    return new OntraportClient(ctx).data("/object", {
      query: { objectID: OBJECT_TYPE.SEQUENCE, id: input.id },
    });
  },
};

export default sequenceGet;
