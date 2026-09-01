import { assertEquals } from "@std/assert";
import windowHover from "../../actions/window-hover.ts";
import { aiEnvelope, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("window-hover: posts elementDescription to the hover path", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: aiEnvelope("Hovered.") }]);
  const out = await windowHover.execute(
    { sessionId: "s1", windowId: "w1", elementDescription: "The menu icon" },
    ctx,
  );

  assertEquals(pathOf(calls[0].url), "/api/v1/sessions/s1/windows/w1/hover");
  assertEquals(JSON.parse(calls[0].body!), { elementDescription: "The menu icon" });
  assertEquals((out as { modelResponse: string }).modelResponse, "Hovered.");
});
