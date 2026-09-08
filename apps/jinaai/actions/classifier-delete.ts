import type { ActionDefinition } from "@w6w/types";
import { JinaClient } from "../lib/client.ts";

interface Input {
  classifierId: string;
}

const classifierDelete: ActionDefinition<Input> = {
  key: "classifier-delete",
  type: "perform",
  resource: "classifier",
  idempotent: true,
  title: "Delete Classifier",
  description: "Permanently delete a trained classifier.",
  params: [
    { key: "classifierId", label: "Classifier ID", type: "string", required: true },
  ],
  output: [
    { key: "deleted", type: "boolean", label: "Deleted" },
  ],

  async execute(input, ctx) {
    const client = new JinaClient(ctx);
    await client.request(`/v1/classifiers/${encodeURIComponent(input.classifierId)}`, {
      method: "DELETE",
    });
    return { deleted: true };
  },
};

export default classifierDelete;
