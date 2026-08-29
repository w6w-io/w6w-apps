import type { ActionDefinition } from "@w6w/types";
import { PushbulletClient } from "../lib/client.ts";

/** `DELETE /v2/pushes/{iden}`. Response is `{}` on success. */
interface Input {
  iden: string;
}

const pushDelete: ActionDefinition<Input> = {
  key: "push-delete",
  type: "perform",
  resource: "push",
  title: "Delete Push",
  description: "Delete a single push.",
  idempotent: true,
  params: [{ key: "iden", label: "Push ID", type: "string", required: true }],
  output: [{ key: "deleted", type: "boolean", label: "Deleted" }],

  async execute(input, ctx) {
    const status = await new PushbulletClient(ctx).status(
      `/pushes/${encodeURIComponent(input.iden)}`,
      { method: "DELETE" },
    );
    return { deleted: status === 200 };
  },
};

export default pushDelete;
