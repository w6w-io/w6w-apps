import type { ActionDefinition } from "@w6w/types";
import { idempotencyHeaders, resolveAccountId, WhopClient } from "../lib/client.ts";
import { accountIdParam } from "../lib/params.ts";

interface Input {
  accountId?: string;
  title: string;
  description?: string;
  headline?: string;
  visibility?: string;
}

const productCreate: ActionDefinition<Input> = {
  key: "product-create",
  type: "perform",
  resource: "product",
  title: "Create Product",
  description: "Create a new product for an account.",
  idempotent: true,
  params: [
    accountIdParam,
    { key: "title", label: "Title", type: "string", required: true },
    { key: "description", label: "Description", type: "text" },
    { key: "headline", label: "Headline", type: "string" },
    {
      key: "visibility",
      label: "Visibility",
      type: "select",
      options: [
        { value: "visible", label: "Visible" },
        { value: "hidden", label: "Hidden" },
        { value: "archived", label: "Archived" },
      ],
    },
  ],
  output: [{ key: "data", type: "object", label: "The created product" }],

  execute(input, ctx) {
    return new WhopClient(ctx).post(
      "/products",
      {
        account_id: resolveAccountId(input.accountId, ctx),
        title: input.title,
        description: input.description,
        headline: input.headline,
        visibility: input.visibility,
      },
      idempotencyHeaders(ctx)["Idempotency-Key"],
    );
  },
};

export default productCreate;
