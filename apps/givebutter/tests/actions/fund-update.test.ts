import { assertEquals } from "@std/assert";
import fundUpdate from "../../actions/fund-update.ts";
import { envelope, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("fund-update: PUTs to /funds/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ id: "1", name: "Renamed" }) }]);
  await fundUpdate.execute({ id: "1", name: "Renamed" }, ctx);

  assertEquals(calls[0].method, "PUT");
  assertEquals(pathOf(calls[0].url), "/v1/funds/1");
  assertEquals(JSON.parse(calls[0].body!), { name: "Renamed" });
});
