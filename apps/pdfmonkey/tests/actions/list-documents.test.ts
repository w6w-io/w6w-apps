import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/list-documents.ts";

Deno.test("list-documents: GETs /document_cards with bracketed page/query filters", async () => {
  const body = { document_cards: [{ id: "doc-1" }], meta: { current_page: 1, total_pages: 1 } };
  const { ctx, calls } = mockCtx([{ body }]);
  const result = await action.execute!(
    {
      page: 2,
      documentTemplateId: "tpl-1",
      status: "success",
      workspaceId: "ws-1",
      updatedSince: "1640995200",
      search: "invoice",
    },
    ctx,
  );

  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/v1/document_cards");
  assertEquals(url.searchParams.get("page[number]"), "2");
  assertEquals(url.searchParams.get("q[document_template_id]"), "tpl-1");
  assertEquals(url.searchParams.get("q[status]"), "success");
  assertEquals(url.searchParams.get("q[workspace_id]"), "ws-1");
  assertEquals(url.searchParams.get("q[updated_since]"), "1640995200");
  assertEquals(url.searchParams.get("q[search]"), "invoice");
  assertEquals(result, body);
});

Deno.test("list-documents: omits every filter when unset", async () => {
  const { ctx, calls } = mockCtx([{ body: { document_cards: [], meta: {} } }]);
  await action.execute!({}, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.search, "");
});
