import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/get-brand-template-dataset.ts";

Deno.test("get-brand-template-dataset: GETs /rest/v1/brand-templates/{id}/dataset", async () => {
  const { ctx, calls } = mockCtx([{ body: { dataset: { photo: { type: "image" } } } }]);
  const result = await action.execute({ brandTemplateId: "BT1" }, ctx) as { dataset: unknown };
  assertEquals(new URL(calls[0].url).pathname, "/rest/v1/brand-templates/BT1/dataset");
  assertEquals(result.dataset, { photo: { type: "image" } });
});
