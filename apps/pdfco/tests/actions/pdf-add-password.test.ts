import { assertEquals } from "@std/assert";
import pdfAddPassword from "../../actions/pdf-add-password.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("pdf-add-password: posts to /v1/pdf/security/add with camelCase fields", async () => {
  const { ctx, calls } = mockCtx([{ body: { url: "https://x/out.pdf" } }]);
  const out = await pdfAddPassword.execute(
    {
      url: "https://example.com/a.pdf",
      ownerPassword: "owner1",
      userPassword: "user1",
      allowPrintDocument: true,
    },
    ctx,
  );

  assertEquals(pathOf(calls[0].url), "/v1/pdf/security/add");
  const sent = JSON.parse(calls[0].body!);
  assertEquals(sent.ownerPassword, "owner1");
  assertEquals(sent.userPassword, "user1");
  assertEquals(sent.allowPrintDocument, true);
  assertEquals("ownerpassword" in sent, false);
  assertEquals(out.url, "https://x/out.pdf");
});
