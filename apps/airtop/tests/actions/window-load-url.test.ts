import { assertEquals } from "@std/assert";
import windowLoadUrl from "../../actions/window-load-url.ts";
import { envelope, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("window-load-url: POSTs the url and wait options to the window path", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ success: true }) }]);
  const out = await windowLoadUrl.execute(
    { sessionId: "s1", windowId: "w1", url: "https://example.com", waitUntil: "complete" },
    ctx,
  );

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/api/v1/sessions/s1/windows/w1");
  assertEquals(JSON.parse(calls[0].body!), {
    url: "https://example.com",
    waitUntil: "complete",
  });
  assertEquals(out, { success: true });
});
