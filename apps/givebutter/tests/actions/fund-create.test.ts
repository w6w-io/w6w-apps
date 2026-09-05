import { assertEquals } from "@std/assert";
import fundCreate from "../../actions/fund-create.ts";
import { envelope, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("fund-create: POSTs name/code to /funds", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ id: "1", name: "Scholarship" }) }]);
  await fundCreate.execute({ name: "Scholarship", code: "SCH" }, ctx);

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v1/funds");
  assertEquals(JSON.parse(calls[0].body!), { name: "Scholarship", code: "SCH" });
});
