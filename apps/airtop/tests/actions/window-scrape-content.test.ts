import { assertEquals } from "@std/assert";
import windowScrapeContent from "../../actions/window-scrape-content.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("window-scrape-content: reads the structured object shape, not a plain string", async () => {
  const { ctx, calls } = mockCtx([{
    status: 201,
    body: {
      meta: { status: "success", usage: { id: "r1", credits: 1 }, requestId: "req1" },
      data: {
        modelResponse: {
          scrapedContent: { text: "Hello world", contentType: "text/plain" },
          title: "Example Domain",
          selectedText: "",
        },
      },
      errors: [],
      warnings: null,
    },
  }]);
  const out = await windowScrapeContent.execute({ sessionId: "s1", windowId: "w1" }, ctx);

  assertEquals(pathOf(calls[0].url), "/api/v1/sessions/s1/windows/w1/scrape-content");
  assertEquals(out, {
    text: "Hello world",
    contentType: "text/plain",
    title: "Example Domain",
    selectedText: "",
    status: "success",
    credits: 1,
    requestId: "req1",
  });
});
