import { assertEquals } from "@std/assert";
import customerDelete from "../../actions/customer-delete.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("customer-delete: DELETEs by id", async () => {
  const { ctx, calls } = mockCtx([{ status: 204, body: undefined }]);
  const out = await customerDelete.execute({ id: "cu_eXampl3" }, ctx);

  assertEquals(pathOf(calls[0].url), "/1.6/customers/cu_eXampl3/");
  assertEquals(calls[0].method, "DELETE");
  assertEquals(out, { result: null });
});

Deno.test("customer-delete: handles the docs' example body (an array) without throwing", async () => {
  const { ctx } = mockCtx([{ body: [{ id: "cu_eXampl3" }] }]);
  const out = await customerDelete.execute({ id: "cu_eXampl3" }, ctx);
  assertEquals(out, { result: [{ id: "cu_eXampl3" }] });
});
