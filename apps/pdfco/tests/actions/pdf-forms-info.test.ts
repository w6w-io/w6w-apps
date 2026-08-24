import { assertEquals } from "@std/assert";
import pdfFormsInfo from "../../actions/pdf-forms-info.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("pdf-forms-info: posts to /v1/pdf/info/fields and returns the field info", async () => {
  const { ctx, calls } = mockCtx([{ body: { info: { Fields: [{ FieldName: "name" }] } } }]);
  const out = await pdfFormsInfo.execute({ url: "https://example.com/form.pdf" }, ctx);

  assertEquals(pathOf(calls[0].url), "/v1/pdf/info/fields");
  assertEquals((out.info?.Fields as unknown[])?.length, 1);
});
