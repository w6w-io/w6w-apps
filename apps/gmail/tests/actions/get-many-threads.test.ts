import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/get-many-threads.ts";

Deno.test("get-many-threads: applies default maxResults=100 at users/me/threads", async () => {
  const { ctx, calls } = mockCtx([{ body: { threads: [] } }]);
  await action.execute!({}, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/gmail/v1/users/me/threads");
  assertEquals(url.searchParams.get("maxResults"), "100");
});

Deno.test("get-many-threads: forwards query + labelIds", async () => {
  const { ctx, calls } = mockCtx([{ body: { threads: [] } }]);
  await action.execute!({ q: "is:unread", labelIds: ["INBOX"] }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("q"), "is:unread");
  assertEquals(url.searchParams.getAll("labelIds"), ["INBOX"]);
});
