import { assertEquals } from "@std/assert";
import formGet from "../../actions/form-get.ts";
import { envelope, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("form-get: GETs one form by id, unwrapped (not nested under a 'form' key)", async () => {
  const { ctx, calls } = mockCtx([
    { body: envelope({ formId: 1, formName: "Incident Report", questions: [], settings: {} }) },
  ]);
  const out = await formGet.execute({ formId: 1 }, ctx);
  assertEquals(pathOf(calls[0].url), "/forms/v1/forms/1");
  assertEquals(out, { formId: 1, formName: "Incident Report", questions: [], settings: {} });
});
