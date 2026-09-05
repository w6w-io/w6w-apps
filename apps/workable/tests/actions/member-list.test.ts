import { assertEquals } from "@std/assert";
import { mockWorkableCtx } from "../_helpers.ts";
import action from "../../actions/member-list.ts";

Deno.test("member-list: GETs /members with compacted filters", async () => {
  const { ctx, calls } = mockWorkableCtx([{ body: { members: [{ id: "m1" }] } }]);
  const out = await action.execute({ role: "admin", status: "active" }, ctx);
  assertEquals(
    calls[0].url,
    "https://acme.workable.com/spi/v3/members?role=admin&status=active",
  );
  assertEquals(out, { members: [{ id: "m1" }] });
});

Deno.test("member-list: no filters means a bare /members call", async () => {
  const { ctx, calls } = mockWorkableCtx([{ body: { members: [] } }]);
  await action.execute({}, ctx);
  assertEquals(calls[0].url, "https://acme.workable.com/spi/v3/members");
});
