import type { ActionDefinition } from "@w6w/types";
import { LearnWorldsClient } from "../lib/client.ts";

/**
 * `DELETE /v2/users/{id}/enrollment` — unenroll a user from a product. Takes
 * a JSON body identifying the product, not path/query parameters. Removing
 * an enrollment that is already gone leaves the same end state, so this is
 * idempotent.
 */
interface Input {
  id: string;
  productId: string;
  productType: string;
}

const userUnenroll: ActionDefinition<Input> = {
  key: "user-unenroll",
  type: "perform",
  resource: "enrollment",
  title: "Unenroll a User",
  description: "Unenroll a user from a course, bundle, or subscription.",
  idempotent: true,
  params: [
    { key: "id", label: "User ID or email", type: "string", required: true },
    { key: "productId", label: "Product ID", type: "string", required: true },
    {
      key: "productType",
      label: "Product type",
      type: "select",
      required: true,
      options: [
        { label: "Course", value: "course" },
        { label: "Bundle", value: "bundle" },
        { label: "Subscription", value: "subscription" },
      ],
    },
  ],
  output: [
    { key: "success", type: "boolean", label: "Success" },
  ],

  async execute(input, ctx) {
    ctx.log("info", "unenrolling a LearnWorlds user", {
      id: input.id,
      productId: input.productId,
    });

    await new LearnWorldsClient(ctx).request(
      `/v2/users/${encodeURIComponent(input.id)}/enrollment`,
      { method: "DELETE", body: { productId: input.productId, productType: input.productType } },
    );
    return { success: true };
  },
};

export default userUnenroll;
