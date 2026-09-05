import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/list-templates.ts";

Deno.test("list-templates: GETs /document_template_cards with q[workspace_id] required", async () => {
  const body = { document_template_cards: [{ id: "tpl-1" }], meta: { total_pages: 1 } };
  const { ctx, calls } = mockCtx([{ body }]);
  const result = await action.execute!(
    { workspaceId: "ws-1", folders: "all", page: 1, sort: "identifier" },
    ctx,
  );

  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/v1/document_template_cards");
  assertEquals(url.searchParams.get("q[workspace_id]"), "ws-1");
  assertEquals(url.searchParams.get("q[folders]"), "all");
  assertEquals(url.searchParams.get("page"), "1");
  assertEquals(url.searchParams.get("sort"), "identifier");
  assertEquals(result, body);
});

Deno.test("list-templates: uses the plain page param, not page[number] (per Templates API docs)", async () => {
  const { ctx, calls } = mockCtx([{ body: { document_template_cards: [], meta: {} } }]);
  await action.execute!({ workspaceId: "ws-1" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.has("page[number]"), false);
});
