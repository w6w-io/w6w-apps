import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import { display, page } from "./_shared.ts";
import action from "../../actions/invoice-list.ts";

Deno.test("invoice-list: lists invoices via Object Query", async () => {
  const { ctx, calls } = mockCtx([page([{ id: "inv1" }])], { display });
  const result = await action.execute!({}, ctx) as { count: number };
  assertEquals(calls[0].url.split("?")[0], "https://rest.zuora.com/object-query/invoices");
  assertEquals(result.count, 1);
});

Deno.test("invoice-list: sends sort[] and fields[] when provided", async () => {
  const { ctx, calls } = mockCtx([page([])], { display });
  await action.execute!({ sort: "invoiceDate.DESC", fields: "id,invoiceNumber" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("sort[]"), "invoiceDate.DESC");
  assertEquals(url.searchParams.get("fields[]"), "id,invoiceNumber");
});
