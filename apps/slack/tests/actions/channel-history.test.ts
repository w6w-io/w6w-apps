import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/channel-history.ts";

Deno.test("channel-history: GETs /conversations.history with channel + limit", async () => {
  const { ctx, calls } = mockCtx([{ body: { ok: true, messages: [] } }]);
  await action.execute!({ channelId: "C1" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/conversations.history");
  assertEquals(url.searchParams.get("channel"), "C1");
  assertEquals(url.searchParams.get("limit"), "100");
  assertEquals(calls[0].method, "GET");
});

Deno.test("channel-history: converts ISO latest/oldest to Slack seconds", async () => {
  const { ctx, calls } = mockCtx([{ body: { ok: true, messages: [] } }]);
  await action.execute!(
    { channelId: "C1", latest: "2024-01-01T00:00:00Z", oldest: "2023-01-01T00:00:00Z" },
    ctx,
  );
  const params = new URL(calls[0].url).searchParams;
  assertEquals(params.get("latest"), String(new Date("2024-01-01T00:00:00Z").getTime() / 1000));
  assertEquals(params.get("oldest"), String(new Date("2023-01-01T00:00:00Z").getTime() / 1000));
});
