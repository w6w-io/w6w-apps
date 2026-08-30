import { assertEquals } from "@std/assert";
import membershipExtend from "../../actions/membership-extend.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("membership-extend: POSTs the days count", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "mem_1" } }]);
  await membershipExtend.execute({ membershipId: "mem_1", days: 7 }, ctx);

  assertEquals(pathOf(calls[0].url), "/memberships/mem_1/extend");
  assertEquals(JSON.parse(calls[0].body!), { days: 7 });
});

Deno.test("membership-extend: days is capped 1-1095", () => {
  const p = membershipExtend.params?.find((p) => p.key === "days");
  assertEquals(p?.validation?.min, 1);
  assertEquals(p?.validation?.max, 1095);
});

Deno.test("membership-extend: declared idempotent because of Idempotency-Key support", () => {
  assertEquals(membershipExtend.idempotent, true);
});
