import { assertEquals } from "@std/assert";
import windowList from "../../actions/window-list.ts";
import { envelope, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("window-list: lists windows for a session", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ windows: [{ windowId: "w1" }] }) }]);
  const out = await windowList.execute({ sessionId: "s1" }, ctx) as { windows: unknown[] };

  assertEquals(pathOf(calls[0].url), "/api/v1/sessions/s1/windows");
  assertEquals(out.windows.length, 1);
});
