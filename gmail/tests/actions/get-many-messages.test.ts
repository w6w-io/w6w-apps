import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/get-many-messages.ts";

Deno.test("get-many-messages: applies default maxResults=100 at users/me/messages", async () => {
  const { ctx, calls } = mockCtx([{ body: { messages: [] } }]);
  await action.execute!({}, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/gmail/v1/users/me/messages");
  assertEquals(url.searchParams.get("maxResults"), "100");
});

Deno.test("get-many-messages: forwards q, labelIds (repeated), and pageToken", async () => {
  const { ctx, calls } = mockCtx([{ body: { messages: [] } }]);
  await action.execute!(
    { q: "is:unread", labelIds: ["INBOX", "STARRED"], pageToken: "tok" },
    ctx,
  );
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("q"), "is:unread");
  assertEquals(url.searchParams.getAll("labelIds"), ["INBOX", "STARRED"]);
  assertEquals(url.searchParams.get("pageToken"), "tok");
});

Deno.test("get-many-messages: omits filters that are undefined", async () => {
  const { ctx, calls } = mockCtx([{ body: { messages: [] } }]);
  await action.execute!({}, ctx);
  const url = new URL(calls[0].url);
  assert(!url.searchParams.has("q"));
  assert(!url.searchParams.has("pageToken"));
});
