import { assertEquals } from "@std/assert";
import tableList from "../../actions/table-list.ts";
import { envelope, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("table-list: returns the data array verbatim", async () => {
  const { ctx, calls } = mockCtx([
    { body: envelope([{ id: "t1", name: "Invoices" }, { id: "t2", name: "Contacts" }]) },
  ]);
  const out = await tableList.execute({}, ctx);
  assertEquals(pathOf(calls[0].url), "/tables");
  assertEquals(out, { data: [{ id: "t1", name: "Invoices" }, { id: "t2", name: "Contacts" }] });
});

Deno.test("table-list: takes no parameters", () => {
  assertEquals(tableList.params?.length, 0);
});
