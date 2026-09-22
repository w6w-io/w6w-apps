import { assertEquals } from "@std/assert";
import cardGet from "../../actions/card-get.ts";
import { CARD, errorBody, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("card-get: GETs one card by id and passes the whole object through", async () => {
  const { ctx, calls } = mockCtx([{ body: CARD }]);
  const result = await cardGet.execute({ id: "card_1" }, ctx) as typeof CARD;

  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/v2/cards/card_1");
  assertEquals(result, CARD);
  // Money is in the currency's smallest unit, as Brex documents: 500000 USD cents.
  assertEquals(result.spend_controls?.spend_limit, { amount: 500000, currency: "USD" });
});

Deno.test("card-get: it asks for nothing that returns a PAN or CVV", async () => {
  // GET /v2/cards/{id}/pan is deliberately not implemented; the card action must
  // never build that path.
  assertEquals(cardGet.params?.map((p) => p.key), ["id"]);

  const { ctx, calls } = mockCtx([{ body: CARD }]);
  await cardGet.execute({ id: "card/1" }, ctx);
  assertEquals(pathOf(calls[0].url), "/v2/cards/card%2F1");
});

Deno.test("card-get: a missing card surfaces Brex's code", async () => {
  const { ctx } = mockCtx([
    { status: 404, body: errorBody("NOT_FOUND", "Not Found", "CARD_NOT_FOUND") },
  ]);
  let message = "";
  try {
    await cardGet.execute({ id: "nope" }, ctx);
  } catch (err) {
    message = (err as Error).message;
  }
  assertEquals(message.includes("code CARD_NOT_FOUND"), true);
});
