import type { ActionDefinition } from "@w6w/types";
import { CannyClient } from "../lib/client.ts";
import { categoryOutput } from "../lib/output.ts";

/** `POST /v1/categories/retrieve` — a single category by id. */
interface Input {
  id: string;
}

const categoryGet: ActionDefinition<Input> = {
  key: "category-get",
  type: "read",
  resource: "category",
  title: "Get Category",
  description: "Retrieve a single category by its id.",
  params: [
    {
      key: "id",
      label: "Category",
      type: "string",
      required: true,
      hint: "The category's unique identifier.",
    },
  ],
  output: categoryOutput,

  execute(input, ctx) {
    return new CannyClient(ctx).post("/categories/retrieve", { id: input.id });
  },
};

export default categoryGet;
