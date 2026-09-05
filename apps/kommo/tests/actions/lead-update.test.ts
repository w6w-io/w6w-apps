import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/lead-update.ts";

const conn = { display: { accountDomain: "acme.kommo.com" } };

Deno.test("lead-update: PATCHes a plain object body to /leads/{id}", async () => {
  const { ctx, calls } = mockCtx(
    [{ status: 200, body: { _embedded: { leads: [{ id: 152464, updated_at: 1686732474 }] } } }],
    conn,
  );
  const out = await action.execute!({ id: 152464, price: 12000 }, ctx);
  assertEquals(calls[0].method, "PATCH");
  assertEquals(calls[0].url, "https://acme.kommo.com/api/v4/leads/152464");
  assertEquals(JSON.parse(calls[0].body!), { price: 12000 });
  assertEquals(out, { id: 152464, updatedAt: 1686732474 });
});

Deno.test("lead-update: only the fields set are sent — others are compacted away", async () => {
  const { ctx, calls } = mockCtx(
    [{ status: 200, body: { _embedded: { leads: [{ id: 1, updated_at: 1 }] } } }],
    conn,
  );
  await action.execute!({ id: 1, name: "Renamed" }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { name: "Renamed" });
});

Deno.test("lead-update: tagsToAdd and tagsToDelete both map to Kommo's [{name}] shape", async () => {
  const { ctx, calls } = mockCtx(
    [{ status: 200, body: { _embedded: { leads: [{ id: 1, updated_at: 1 }] } } }],
    conn,
  );
  await action.execute!({ id: 1, tagsToAdd: "vip", tagsToDelete: "cold" }, ctx);
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.tags_to_add, [{ name: "vip" }]);
  assertEquals(body.tags_to_delete, [{ name: "cold" }]);
});

Deno.test("lead-update: idempotent is true", () => {
  assertEquals(action.idempotent, true);
});
