import { assertEquals } from "@std/assert";
import cardUnlock from "../../actions/card-unlock.ts";
import { CARD, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("card-unlock: POSTs with no body at all, because Brex documents none", async () => {
  const { ctx, calls } = mockCtx([{ body: CARD }]);
  const result = await cardUnlock.execute({ id: "card_1" }, ctx) as typeof CARD;

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v2/cards/card_1/unlock");
  assertEquals(calls[0].body, null);
  // No body means no content-type either — the client only sets it when it has
  // something to serialize.
  assertEquals(calls[0].headers["content-type"], undefined);
  assertEquals(result.status, "ACTIVE");
});

Deno.test("card-unlock: it exposes no reason param, because the endpoint takes none", () => {
  assertEquals(cardUnlock.params?.map((p) => p.key), ["id", "idempotencyKey"]);
});

Deno.test("card-unlock: an idempotency key is forwarded verbatim, and never invented", async () => {
  const withKey = mockCtx([{ body: CARD }]);
  await cardUnlock.execute({ id: "card_1", idempotencyKey: "k1" }, withKey.ctx);
  assertEquals(withKey.calls[0].headers["idempotency-key"], "k1");

  const withoutKey = mockCtx([{ body: CARD }]);
  await cardUnlock.execute({ id: "card_1" }, withoutKey.ctx);
  assertEquals(withoutKey.calls[0].headers["idempotency-key"], undefined);
});

Deno.test("card-unlock: it is a perform declared idempotent", () => {
  assertEquals(cardUnlock.type, "perform");
  assertEquals(cardUnlock.idempotent, true);
});
