import { assertEquals } from "@std/assert";
import pdfRemovePassword from "../../actions/pdf-remove-password.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("pdf-remove-password: posts to /v1/pdf/security/remove", async () => {
  const { ctx, calls } = mockCtx([{ body: { url: "https://x/out.pdf" } }]);
  const out = await pdfRemovePassword.execute(
    { url: "https://example.com/a.pdf", password: "secret" },
    ctx,
  );

  assertEquals(pathOf(calls[0].url), "/v1/pdf/security/remove");
  assertEquals(JSON.parse(calls[0].body!).password, "secret");
  assertEquals(out.url, "https://x/out.pdf");
});
