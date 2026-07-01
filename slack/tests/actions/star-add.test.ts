import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/star-add.ts";

Deno.test("star-add: message target sends { channel, timestamp } to /stars.add", async () => {
  const { ctx, calls } = mockCtx([{ body: { ok: true } }]);
  await action.execute!({ target: "message", channel: "C1", timestamp: "1.1" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/api/stars.add");
  assertEquals(JSON.parse(calls[0].body!), { channel: "C1", timestamp: "1.1" });
});

Deno.test("star-add: file target sends { channel, file }", async () => {
  const { ctx, calls } = mockCtx([{ body: { ok: true } }]);
  await action.execute!({ target: "file", channel: "C1", fileId: "F1" }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { channel: "C1", file: "F1" });
});
