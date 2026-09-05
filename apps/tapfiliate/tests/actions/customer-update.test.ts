import { assertEquals } from "@std/assert";
import customerUpdate from "../../actions/customer-update.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("customer-update: PATCHes only the fields given", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "cu_eXampl3", meta_data: { buz: "baz" } } }]);
  const out = await customerUpdate.execute({ id: "cu_eXampl3", metaData: { buz: "baz" } }, ctx);

  assertEquals(pathOf(calls[0].url), "/1.6/customers/cu_eXampl3/");
  assertEquals(calls[0].method, "PATCH");
  assertEquals(JSON.parse(calls[0].body!), { meta_data: { buz: "baz" } });
  assertEquals(out, { id: "cu_eXampl3", meta_data: { buz: "baz" } });
});
