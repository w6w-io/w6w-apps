import type { ActionDefinition } from "@w6w/types";
import { MercuryClient } from "../lib/client.ts";

/**
 * `POST /categories` — create a new expense category. All four fields are
 * required in the OpenAPI document: `name`, `visibleForCardSpend`,
 * `visibleForOther`, `visibleForReimbursements` — each controlling which
 * transaction kinds this category can be applied to.
 */
interface Input {
  name: string;
  visibleForCardSpend: boolean;
  visibleForOther: boolean;
  visibleForReimbursements: boolean;
}

const categoryCreate: ActionDefinition<Input> = {
  key: "category-create",
  type: "perform",
  resource: "category",
  title: "Create Category",
  description: "Create a new custom expense category.",
  idempotent: false,
  params: [
    { key: "name", label: "Name", type: "string", required: true },
    {
      key: "visibleForCardSpend",
      label: "Applicable to card spend",
      type: "boolean",
      required: true,
      default: true,
    },
    {
      key: "visibleForOther",
      label: "Applicable to other transaction kinds",
      type: "boolean",
      required: true,
      default: true,
    },
    {
      key: "visibleForReimbursements",
      label: "Applicable to expense reimbursements",
      type: "boolean",
      required: true,
      default: true,
    },
  ],
  output: [{ key: "category", type: "object", label: "Created category" }],

  async execute(input, ctx) {
    const category = await new MercuryClient(ctx).json("/categories", {
      method: "POST",
      body: {
        name: input.name,
        visibleForCardSpend: input.visibleForCardSpend,
        visibleForOther: input.visibleForOther,
        visibleForReimbursements: input.visibleForReimbursements,
      },
    });
    return { category };
  },
};

export default categoryCreate;
