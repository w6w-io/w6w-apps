import { assertEquals } from "@std/assert";
import getMessages from "../../actions/get-messages.ts";
import { mockMatrixCtx } from "../_helpers.ts";

Deno.test("get-messages: GETs /rooms/{roomId}/messages with dir/limit/from as query params", async () => {
  const { ctx, calls } = mockMatrixCtx([
    { body: { chunk: [{ event_id: "$e1:example.org" }], start: "t1", end: "t2" } },
  ]);
  const result = await getMessages.execute(
    { roomId: "!x:example.org", direction: "f", limit: 5, from: "t0" },
    ctx,
  );
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/_matrix/client/v3/rooms/!x%3Aexample.org/messages");
  assertEquals(url.searchParams.get("dir"), "f");
  assertEquals(url.searchParams.get("limit"), "5");
  assertEquals(url.searchParams.get("from"), "t0");
  assertEquals(result.events.length, 1);
  assertEquals(result.start, "t1");
  assertEquals(result.end, "t2");
});

Deno.test("get-messages: defaults to backwards direction and limit 10", async () => {
  const { ctx, calls } = mockMatrixCtx([{ body: { chunk: [], start: "t1" } }]);
  await getMessages.execute({ roomId: "!x:example.org" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("dir"), "b");
  assertEquals(url.searchParams.get("limit"), "10");
  assertEquals(url.searchParams.has("from"), false);
});
