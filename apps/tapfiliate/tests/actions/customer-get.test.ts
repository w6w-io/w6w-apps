import { assertEquals } from "@std/assert";
import customerGet from "../../actions/customer-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("customer-get: fetches by id and returns the object verbatim", async () => {
  const { ctx, calls } = mockCtx([{
    body: { id: "cu_eXampl3", customer_id: "USER123", status: "trial" },
  }]);
  const out = await customerGet.execute({ id: "cu_eXampl3" }, ctx);

  assertEquals(pathOf(calls[0].url), "/1.6/customers/cu_eXampl3/");
  assertEquals(calls[0].method, "GET");
  assertEquals(out, { id: "cu_eXampl3", customer_id: "USER123", status: "trial" });
});

Deno.test("customer-get: path-escapes the id", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await customerGet.execute({ id: "cu/weird id" }, ctx);
  assertEquals(pathOf(calls[0].url), "/1.6/customers/cu%2Fweird%20id/");
});
