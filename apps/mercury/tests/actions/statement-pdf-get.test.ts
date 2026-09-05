import { assertEquals } from "@std/assert";
import statementPdfGet, { fileNameFrom } from "../../actions/statement-pdf-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("statement-pdf-get: GETs /statements/{id}/pdf with accept: */*", async () => {
  const { ctx, calls } = mockCtx([
    {
      body: "PDF-BYTES",
      headers: {
        "content-type": "application/pdf",
        "content-disposition": 'attachment; filename="statement.pdf"',
      },
    },
  ]);
  const out = await statementPdfGet.execute({ statementId: "st_1" }, ctx);
  assertEquals(pathOf(calls[0].url), "/api/v1/statements/st_1/pdf");
  assertEquals(calls[0].headers["accept"], "*/*");
  assertEquals(out.encoding, "base64");
  assertEquals(out.contentType, "application/pdf");
  assertEquals(out.fileName, "statement.pdf");
});

Deno.test("statement-pdf-get: base64-decodes back to the original bytes", async () => {
  const { ctx } = mockCtx([{ body: "hello pdf" }]);
  const out = await statementPdfGet.execute({ statementId: "st_1" }, ctx);
  assertEquals(atob(out.content), "hello pdf");
});

Deno.test("fileNameFrom: parses a quoted filename, returns undefined for no header", () => {
  assertEquals(fileNameFrom('attachment; filename="a.pdf"'), "a.pdf");
  assertEquals(fileNameFrom(null), undefined);
});
