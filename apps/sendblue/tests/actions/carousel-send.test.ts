import { assertEquals } from "@std/assert";
import carouselSend from "../../actions/carousel-send.ts";
import { jsonBodyOf, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("carousel-send: POSTs to /api/send-carousel with a normalised media_urls array", async () => {
  const { ctx, calls } = mockCtx([{ body: { status: "QUEUED", message_type: "carousel" } }]);
  await carouselSend.execute({
    fromNumber: "+1",
    number: "+2",
    mediaUrls: ["https://a.example/1.jpg", "https://a.example/2.jpg"],
  }, ctx);

  assertEquals(pathOf(calls[0].url), "/api/send-carousel");
  assertEquals(jsonBodyOf(calls[0]), {
    from_number: "+1",
    number: "+2",
    media_urls: ["https://a.example/1.jpg", "https://a.example/2.jpg"],
  });
});
