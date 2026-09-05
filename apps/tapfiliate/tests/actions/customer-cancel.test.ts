import { assertEquals } from "@std/assert";
import customerCancel from "../../actions/customer-cancel.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("customer-cancel: DELETEs the status sub-resource", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "cu_eXampl3Pay1ng", status: "canceled" } }]);
  const out = await customerCancel.execute({ id: "cu_eXampl3Pay1ng" }, ctx) as Record<
    string,
    unknown
  >;

  assertEquals(pathOf(calls[0].url), "/1.6/customers/cu_eXampl3Pay1ng/status/");
  assertEquals(calls[0].method, "DELETE");
  assertEquals(out.status, "canceled");
});
