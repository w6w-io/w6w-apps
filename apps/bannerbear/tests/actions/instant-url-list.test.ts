import { assertEquals } from "@std/assert";
import instantUrlList from "../../actions/instant-url-list.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("instant-url-list: GET /instant_urls", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ uid: "iu1", base_url: "https://cdn/x" }] }]);
  const out = await instantUrlList.execute({}, ctx) as unknown[];

  assertEquals(pathOf(calls[0].url), "/instant_urls");
  assertEquals(out.length, 1);
  // The vendor returns signing_key only at creation — a list entry never has one.
  assertEquals("signing_key" in (out[0] as Record<string, unknown>), false);
});
