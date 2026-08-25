import type { ActionDefinition } from "@w6w/types";
import { encodeId, StreakClient } from "../lib/client.ts";
import { boxKeyParam } from "../lib/params.ts";

/** `GET /boxes/{boxKey}` — one box, including its custom field values keyed by field id. */
interface Input {
  boxKey: string;
}

const boxGet: ActionDefinition<Input> = {
  key: "box-get",
  type: "read",
  resource: "box",
  title: "Get Box",
  description: "Fetch one box (record), including its custom field values.",
  params: [boxKeyParam],
  output: [{ key: "data", type: "object", label: "The box" }],

  execute(input, ctx) {
    return new StreakClient(ctx).get(`/boxes/${encodeId(input.boxKey)}`);
  },
};

export default boxGet;
