import { assert, assertEquals } from "@std/assert";
import downtimeGet from "../../actions/downtime-get.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

const UUID = "00000000-0000-1234-0000-000000000000";

Deno.test("downtime-get: calls GET /api/v2/downtime/{uuid}", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: { id: UUID } } }]);
  const out = await downtimeGet.execute({ downtimeId: UUID }, ctx) as { data: { id: string } };

  assertEquals(pathOf(calls[0].url), `/api/v2/downtime/${UUID}`);
  assertEquals(out.data.id, UUID);
});

Deno.test("downtime-get: include is passed through", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await downtimeGet.execute({ downtimeId: UUID, include: "created_by,monitor" }, ctx);
  assertEquals(queryOf(calls[0].url), { include: "created_by,monitor" });
});

/** Downtime v2 dropped the integer ids v1 used; an old integer 404s here. */
Deno.test("downtime-get: the id hint says it is a UUID, not the v1 integer", () => {
  const hint = downtimeGet.params?.find((p) => p.key === "downtimeId")?.hint ?? "";
  assert(hint.includes("UUID"), hint);
  assert(hint.includes("numeric ids"), hint);
});
