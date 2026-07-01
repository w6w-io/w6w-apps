import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/create-database-page.ts";

Deno.test("create-database-page: POSTs /pages with database parent, properties and children", async () => {
  const { ctx, calls } = mockCtx([{ body: { object: "page", id: "page-1" } }]);
  await action.execute({
    databaseId: "db-1",
    properties: { Name: { title: [{ text: { content: "Hello" } }] } },
    children: [{ object: "block", type: "paragraph", paragraph: { rich_text: [] } }],
  }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v1/pages");
  assertEquals(calls[0].method, "POST");
  const sent = JSON.parse(calls[0].body ?? "{}");
  assertEquals(sent.parent, { database_id: "db-1" });
  assertEquals(sent.properties.Name.title[0].text.content, "Hello");
  assertEquals(Array.isArray(sent.children), true);
});
