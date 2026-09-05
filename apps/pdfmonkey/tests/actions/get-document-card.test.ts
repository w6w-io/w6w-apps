import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/get-document-card.ts";

Deno.test("get-document-card: GETs /document_cards/{id} and unwraps document_card", async () => {
  const card = { id: "doc-1", status: "success", download_url: "https://x/y.pdf" };
  const { ctx, calls } = mockCtx([{ body: { document_card: card } }]);
  const result = await action.execute!({ documentId: "doc-1" }, ctx);

  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/v1/document_cards/doc-1");
  assertEquals(calls[0].method, "GET");
  assertEquals(result, card);
});
