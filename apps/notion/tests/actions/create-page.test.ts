import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/create-page.ts";

Deno.test("create-page: POSTs /pages under a parent page with a title property", async () => {
  const { ctx, calls } = mockCtx([{ body: { object: "page", id: "page-child" } }]);
  await action.execute({ parentPageId: "parent-1", title: "Welcome" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v1/pages");
  assertEquals(calls[0].method, "POST");
  const sent = JSON.parse(calls[0].body ?? "{}");
  assertEquals(sent.parent, { page_id: "parent-1" });
  assertEquals(sent.properties.title[0].text.content, "Welcome");
});
