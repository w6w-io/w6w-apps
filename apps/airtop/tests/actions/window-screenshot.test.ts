import { assertEquals } from "@std/assert";
import windowScreenshot from "../../actions/window-screenshot.ts";
import { aiEnvelope, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("window-screenshot: the image comes from meta.screenshots, not data.modelResponse", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: aiEnvelope("", {
      screenshots: [{ dataUrl: "data:image/png;base64,AAAA", format: "base64" }],
    }),
  }]);
  const out = await windowScreenshot.execute({ sessionId: "s1", windowId: "w1" }, ctx) as {
    dataUrl?: string;
    screenshotFormat?: string;
  };

  assertEquals(pathOf(calls[0].url), "/api/v1/sessions/s1/windows/w1/screenshot");
  assertEquals(out.dataUrl, "data:image/png;base64,AAAA");
  assertEquals(out.screenshotFormat, "base64");
});

Deno.test("window-screenshot: format/size fields nest under configuration.screenshot", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: aiEnvelope("") }]);
  await windowScreenshot.execute(
    { sessionId: "s1", windowId: "w1", format: "url", maxWidth: 1280, maxHeight: 720 },
    ctx,
  );

  assertEquals(JSON.parse(calls[0].body!), {
    configuration: { screenshot: { format: "url", maxWidth: 1280, maxHeight: 720 } },
  });
});

Deno.test("window-screenshot: is a read — never mutates the page", () => {
  assertEquals(windowScreenshot.type, "read");
});
