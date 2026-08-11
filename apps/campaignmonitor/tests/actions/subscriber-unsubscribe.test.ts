import { assertEquals } from "@std/assert";
import subscriberUnsubscribe from "../../actions/subscriber-unsubscribe.ts";
import subscriberDelete from "../../actions/subscriber-delete.ts";
import { API_PATH, bodyOf, mockCtx, pathOf, queryOf } from "../_helpers.ts";

/** The address goes in the BODY here — unlike delete, which uses the query. */
Deno.test("subscriber-unsubscribe: POSTs the address in the body", async () => {
  const { ctx, calls } = mockCtx([{ status: 200 }]);
  const out = await subscriberUnsubscribe.execute({ listId: "lid", email: "a@example.com" }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), `${API_PATH}/subscribers/lid/unsubscribe.json`);
  assertEquals(bodyOf(calls[0]), { EmailAddress: "a@example.com" });
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(out, { EmailAddress: "a@example.com" });
});

/**
 * The pair, side by side, because the asymmetry is the point: unsubscribe is a
 * POST with a body, delete is a DELETE with a query parameter.
 */
Deno.test("subscriber-unsubscribe vs subscriber-delete: different verb and different slot", async () => {
  const { ctx, calls } = mockCtx([{ status: 200 }, { status: 200 }]);
  await subscriberUnsubscribe.execute({ listId: "lid", email: "a@b.com" }, ctx);
  await subscriberDelete.execute({ listId: "lid", email: "a@b.com" }, ctx);

  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].body, JSON.stringify({ EmailAddress: "a@b.com" }));

  assertEquals(calls[1].method, "DELETE");
  assertEquals(calls[1].body, null);
  assertEquals(queryOf(calls[1].url), { email: "a@b.com" });
});

Deno.test("subscriber-unsubscribe: is declared idempotent", () => {
  assertEquals(subscriberUnsubscribe.idempotent, true);
});
