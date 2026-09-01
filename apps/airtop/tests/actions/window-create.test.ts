import { assertEquals } from "@std/assert";
import windowCreate from "../../actions/window-create.ts";
import { envelope, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("window-create: POSTs to the session's windows collection", async () => {
  const { ctx, calls } = mockCtx([{
    status: 201,
    body: envelope({ windowId: "w1", targetId: "t1", title: "", url: "https://example.com" }),
  }]);
  const out = await windowCreate.execute(
    { sessionId: "s1", url: "https://example.com", waitUntil: "load" },
    ctx,
  ) as { windowId: string };

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/api/v1/sessions/s1/windows");
  assertEquals(JSON.parse(calls[0].body!), { url: "https://example.com", waitUntil: "load" });
  assertEquals(out.windowId, "w1");
});

Deno.test("window-create: is declared non-idempotent — every call opens a new window", () => {
  assertEquals(windowCreate.idempotent, false);
});
