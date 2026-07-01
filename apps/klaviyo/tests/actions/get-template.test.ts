import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/get-template.ts";

Deno.test("get-template: GETs /templates/{id}/", async () => {
  const body = { data: { type: "template", id: "t-1" } };
  const { ctx, calls } = mockCtx([{ body }]);
  const result = await action.execute!({ templateId: "t-1" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/api/templates/t-1/");
  assertEquals(result, body);
});
