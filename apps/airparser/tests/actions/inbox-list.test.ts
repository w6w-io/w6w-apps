import { assertEquals } from "@std/assert";
import inboxList from "../../actions/inbox-list.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("inbox-list: fetches GET /inboxes and returns the body verbatim", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: [{ _id: "in_1", name: "Invoices" }] }]);
  const result = await inboxList.execute({}, ctx);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/inboxes");
  assertEquals(result, [{ _id: "in_1", name: "Invoices" }]);
});

Deno.test("inbox-list: search type, no params — the same call the auth probe makes", () => {
  assertEquals(inboxList.type, "search");
  assertEquals(inboxList.params, []);
});
