import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/get-brand-template.ts";

Deno.test("get-brand-template: GETs /rest/v1/brand-templates/{id} and unwraps envelope", async () => {
  const { ctx, calls } = mockCtx([{ body: { brand_template: { id: "BT1", title: "Ad" } } }]);
  const result = await action.execute({ brandTemplateId: "BT1" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/rest/v1/brand-templates/BT1");
  assertEquals(result, { id: "BT1", title: "Ad" });
});
