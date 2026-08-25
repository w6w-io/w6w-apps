import type { ActionDefinition } from "@w6w/types";
import { encodeId, StreakClient } from "../lib/client.ts";
import { boxKeyParam } from "../lib/params.ts";

/** `DELETE /boxes/{boxKey}`. */
interface Input {
  boxKey: string;
}

const boxDelete: ActionDefinition<Input> = {
  key: "box-delete",
  type: "perform",
  resource: "box",
  title: "Delete Box",
  description: "Permanently delete a box (record).",
  idempotent: true,
  params: [boxKeyParam],
  output: [{ key: "success", type: "boolean", label: "Deleted" }],

  execute(input, ctx) {
    return new StreakClient(ctx).del(`/boxes/${encodeId(input.boxKey)}`);
  },
};

export default boxDelete;
