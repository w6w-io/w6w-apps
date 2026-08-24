import { assertEquals } from "@std/assert";
import pdfToCsv from "../../actions/pdf-to-csv.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("pdf-to-csv: posts to /v1/pdf/convert/to/csv and returns the CSV body", async () => {
  const { ctx, calls } = mockCtx([{ body: { body: "a,b\n1,2", pageCount: 1 } }]);
  const out = await pdfToCsv.execute({ url: "https://example.com/a.pdf" }, ctx);

  assertEquals(pathOf(calls[0].url), "/v1/pdf/convert/to/csv");
  assertEquals(out.body, "a,b\n1,2");
});
