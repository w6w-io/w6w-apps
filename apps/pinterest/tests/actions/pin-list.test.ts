import { assertEquals } from "@std/assert";
import pinList from "../../actions/pin-list.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("pin-list: calls GET /pins", async () => {
  const { ctx, calls } = mockCtx([{ body: { items: [{ id: "1" }], bookmark: "c1" } }]);
  const out = await pinList.execute({}, ctx) as { items: unknown[]; bookmark: string };

  assertEquals(pathOf(calls[0].url), "/v5/pins");
  assertEquals(out.items.length, 1);
  assertEquals(out.bookmark, "c1");
});

Deno.test("pin-list: forwards pin_filter, linkDomain and include_protected_pins", async () => {
  const { ctx, calls } = mockCtx([{ body: { items: [] } }]);
  await pinList.execute(
    { pinFilter: "exclude_repins", linkDomain: "pinterest.com", includeProtectedPins: true },
    ctx,
  );
  const q = queryOf(calls[0].url);
  assertEquals(q.pin_filter, "exclude_repins");
  assertEquals(q.domain, "pinterest.com");
  assertEquals(q.include_protected_pins, "true");
});
