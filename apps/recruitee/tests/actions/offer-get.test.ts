import { assertEquals } from "@std/assert";
import offerGet from "../../actions/offer-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("offer-get: fetches by id", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { offer: { id: 3, title: "Backend" } } }]);
  const out = await offerGet.execute({ offerId: 3 }, ctx) as { offer: { title: string } };

  assertEquals(pathOf(calls[0].url), "/c/123/offers/3");
  assertEquals(out.offer.title, "Backend");
});
