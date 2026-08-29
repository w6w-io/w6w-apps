import type { ActionDefinition } from "@w6w/types";
import { PushbulletClient } from "../lib/client.ts";

/**
 * `POST /v2/pushes/{iden}` — the only documented field is `dismissed`, which
 * hides any notification for the push. Setting it to the same value twice
 * leaves the push in the same state, so this is safely retryable.
 */
interface Input {
  iden: string;
  dismissed: boolean;
}

const pushUpdate: ActionDefinition<Input> = {
  key: "push-update",
  type: "perform",
  resource: "push",
  title: "Update Push",
  description: "Mark a push as dismissed (or not), hiding its notification where possible.",
  idempotent: true,
  params: [
    { key: "iden", label: "Push ID", type: "string", required: true },
    { key: "dismissed", label: "Dismissed", type: "boolean", required: true, default: true },
  ],
  output: [
    { key: "iden", type: "string", label: "Push ID" },
    { key: "dismissed", type: "boolean", label: "Dismissed" },
  ],

  async execute(input, ctx) {
    return await new PushbulletClient(ctx).json(`/pushes/${encodeURIComponent(input.iden)}`, {
      method: "POST",
      body: { dismissed: input.dismissed },
    });
  },
};

export default pushUpdate;
