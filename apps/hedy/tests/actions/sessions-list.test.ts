import { assert, assertEquals } from "@std/assert";
import sessionsList from "../../actions/sessions-list.ts";
import { listEnvelope, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("sessions-list: calls GET /sessions and unwraps items + pagination", async () => {
  const { ctx, calls } = mockCtx([
    {
      body: listEnvelope(
        [{ id: "sess_1", title: "Weekly Sync", startTime: "2024-03-15T14:30:00Z", duration: 45 }],
        { hasMore: true, next: "sess_2", total: 150 },
      ),
    },
  ]);
  const out = await sessionsList.execute({ limit: 50 }, ctx) as Record<string, unknown>;

  assertEquals(pathOf(calls[0].url), "/sessions");
  assertEquals(queryOf(calls[0].url).limit, "50");
  assertEquals(out.items, [
    { id: "sess_1", title: "Weekly Sync", startTime: "2024-03-15T14:30:00Z", duration: 45 },
  ]);
  assertEquals(out.hasMore, true);
  assertEquals(out.next, "sess_2");
  assertEquals(out.total, 150);
});

Deno.test("sessions-list: omitting limit sends no limit query param", async () => {
  const { ctx, calls } = mockCtx([{ body: listEnvelope([]) }]);
  await sessionsList.execute({}, ctx);
  assert(!("limit" in queryOf(calls[0].url)));
});

Deno.test("sessions-list: an empty data array is reported as an empty list, not undefined", async () => {
  const { ctx } = mockCtx([{ body: { success: true, data: null, pagination: { total: 0 } } }]);
  const out = await sessionsList.execute({}, ctx) as { items: unknown[] };
  assertEquals(out.items, []);
});

Deno.test("sessions-list: an authentication failure throws with the vendor's error code", async () => {
  const { ctx } = mockCtx([
    {
      status: 401,
      body: { success: false, error: { code: "missing_api_key", message: "Missing API key" } },
    },
  ]);
  await assertRejectsWith(async () => await sessionsList.execute({}, ctx), "missing_api_key");
});

async function assertRejectsWith(fn: () => Promise<unknown>, needle: string) {
  try {
    await fn();
    throw new Error("expected fn to reject");
  } catch (err) {
    assert(String((err as Error).message).includes(needle), `expected error to mention ${needle}`);
  }
}
