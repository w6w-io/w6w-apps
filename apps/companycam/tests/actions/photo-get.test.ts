import { assertEquals } from "@std/assert";
import photoGet from "../../actions/photo-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("photo-get: reads one photo with its processing status", async () => {
  const { ctx, calls } = mockCtx([{
    body: {
      id: "4782987471",
      processing_status: "pending",
      uris: [{ type: "original", uri: "https://static.companycam.com/a.jpg" }],
    },
  }]);
  const photo = await photoGet.execute({ photoId: "4782987471" }, ctx) as {
    processing_status: string;
  };
  assertEquals(pathOf(calls[0].url), "/v2/photos/4782987471");
  assertEquals(photo.processing_status, "pending");
});

Deno.test("photo-get: declares uris, since there is no single photo URL field", () => {
  const keys = (photoGet.output as Array<{ key: string }>).map((o) => o.key);
  assertEquals(keys.includes("uris"), true);
  assertEquals(keys.includes("processing_status"), true);
});
