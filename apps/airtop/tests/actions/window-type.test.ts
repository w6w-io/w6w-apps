import { assertEquals } from "@std/assert";
import windowType from "../../actions/window-type.ts";
import { aiEnvelope, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("window-type: text is required, elementDescription is not", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: aiEnvelope("Typed.") }]);
  await windowType.execute(
    { sessionId: "s1", windowId: "w1", text: "hello", pressEnterKey: true },
    ctx,
  );

  assertEquals(pathOf(calls[0].url), "/api/v1/sessions/s1/windows/w1/type");
  assertEquals(JSON.parse(calls[0].body!), { text: "hello", pressEnterKey: true });
});

Deno.test("window-type: only text is required in the action's own params", () => {
  const textParam = windowType.params?.find((p) => p.key === "text");
  const elementDescriptionParam = windowType.params?.find((p) => p.key === "elementDescription");
  assertEquals(textParam?.required, true);
  assertEquals(elementDescriptionParam?.required, undefined);
});
