import { assertEquals } from "@std/assert";
import schedulerList from "../../actions/scheduler-list.ts";
import { envelope, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("scheduler-list: GETs /scheduler/v1/schedulers with no params", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ schedulers: [{ id: 1 }] }) }]);
  const out = await schedulerList.execute({}, ctx);
  assertEquals(pathOf(calls[0].url), "/scheduler/v1/schedulers");
  assertEquals(out, { schedulers: [{ id: 1 }] });
});
