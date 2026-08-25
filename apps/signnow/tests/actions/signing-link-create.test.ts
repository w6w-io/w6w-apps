import { assertEquals } from "@std/assert";
import signingLinkCreate from "../../actions/signing-link-create.ts";
import { bodyOf, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("signing-link-create: POSTs document_id to /link", async () => {
  const { ctx, calls } = mockCtx([
    {
      status: 200,
      body: { url: "https://signnow.com/s/1", url_no_signup: "https://signnow.com/s/2" },
    },
  ]);
  const out = await signingLinkCreate.execute({ documentId: "doc-1" }, ctx) as Record<
    string,
    unknown
  >;
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0]), "/link");
  assertEquals(bodyOf(calls[0]), { document_id: "doc-1" });
  assertEquals(out.url_no_signup, "https://signnow.com/s/2");
});
