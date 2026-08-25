import { assertEquals } from "@std/assert";
import documentInviteCancel from "../../actions/document-invite-cancel.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("document-invite-cancel: PUTs /document/{id}/fieldinvitecancel", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { status: "success" } }]);
  const out = await documentInviteCancel.execute({ documentId: "doc-1" }, ctx) as Record<
    string,
    unknown
  >;
  assertEquals(calls[0].method, "PUT");
  assertEquals(pathOf(calls[0]), "/document/doc-1/fieldinvitecancel");
  assertEquals(out.status, "success");
});
