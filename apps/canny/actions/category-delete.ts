import type { ActionDefinition } from "@w6w/types";
import { CannyClient } from "../lib/client.ts";
import { messageOutput } from "../lib/output.ts";

/**
 * `POST /v1/categories/delete` — permanently delete a category.
 *
 * Marked idempotent: deleting an already-deleted category converges on the
 * same end state a retry is meant to reach, the same reasoning this app
 * applies to every other delete action.
 */
interface Input {
  categoryID: string;
}

const categoryDelete: ActionDefinition<Input> = {
  key: "category-delete",
  type: "perform",
  resource: "category",
  title: "Delete Category",
  description: "Permanently delete a category.",
  idempotent: true,
  params: [
    {
      key: "categoryID",
      label: "Category",
      type: "string",
      required: true,
      hint: "The category's unique identifier.",
    },
  ],
  output: messageOutput,

  async execute(input, ctx) {
    const message = await new CannyClient(ctx).postMessage("/categories/delete", {
      categoryID: input.categoryID,
    });
    return { message };
  },
};

export default categoryDelete;
