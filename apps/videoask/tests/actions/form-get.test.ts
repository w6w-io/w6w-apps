import { assertEquals } from "@std/assert";
import formGet from "../../actions/form-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("form-get: GETs /forms/{formId} and wraps the entity as {result}", async () => {
  const { ctx, calls } = mockCtx([{ body: { form_id: "f1", title: "My VideoAsk" } }]);
  const out = await formGet.execute({ formId: "f1" }, ctx) as { result: { form_id: string } };
  assertEquals(pathOf(calls[0].url), "/forms/f1");
  assertEquals(out.result.form_id, "f1");
});
