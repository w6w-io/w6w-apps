import { assertEquals } from "@std/assert";
import windowClick from "../../actions/window-click.ts";
import { aiEnvelope, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("window-click: posts elementDescription and reads back status/credits", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: aiEnvelope("Clicked the login button.", {
      status: "success",
      usage: { id: "r1", credits: 2 },
    }),
  }]);
  const out = await windowClick.execute(
    {
      sessionId: "s1",
      windowId: "w1",
      elementDescription: "The login button",
      clickType: "doubleClick",
    },
    ctx,
  );

  assertEquals(pathOf(calls[0].url), "/api/v1/sessions/s1/windows/w1/click");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.elementDescription, "The login button");
  assertEquals(body.configuration, { clickType: "doubleClick" });
  assertEquals(out, {
    modelResponse: "Clicked the login button.",
    status: "success",
    credits: 2,
    requestId: "req_test",
  });
});

Deno.test("window-click: is declared non-idempotent", () => {
  assertEquals(windowClick.idempotent, false);
});
