import { assertEquals } from "@std/assert";
import listDocuments from "../../actions/list-documents.ts";
import { mockCtx } from "../_helpers.ts";

const conn = { display: { baseUrl: "https://erpnext.example.com" } };

Deno.test("list-documents: builds the default list call with no extra params", async () => {
  const { ctx, calls } = mockCtx([
    { status: 200, body: { data: [{ name: "CUST-0001" }, { name: "CUST-0002" }] } },
  ], conn);
  const result = await listDocuments.execute({ doctype: "Customer" }, ctx);
  assertEquals(calls[0].url, "https://erpnext.example.com/api/resource/Customer");
  assertEquals(result, { records: [{ name: "CUST-0001" }, { name: "CUST-0002" }], count: 2 });
});

Deno.test("list-documents: encodes a doctype with a space", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { data: [] } }], conn);
  await listDocuments.execute({ doctype: "Sales Order" }, ctx);
  assertEquals(calls[0].url, "https://erpnext.example.com/api/resource/Sales%20Order");
});

Deno.test("list-documents: forwards filters, fields, order and paging", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { data: [] } }], conn);
  await listDocuments.execute({
    doctype: "Customer",
    filters: '[["disabled","=",0]]',
    fields: "name, customer_name",
    orderBy: "modified desc",
    limitStart: 20,
    limitPageLength: 10,
  }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("filters"), '[["disabled","=",0]]');
  assertEquals(url.searchParams.get("fields"), '["name","customer_name"]');
  assertEquals(url.searchParams.get("order_by"), "modified desc");
  assertEquals(url.searchParams.get("limit_start"), "20");
  assertEquals(url.searchParams.get("limit_page_length"), "10");
});

Deno.test("list-documents: an empty result is zero records, not an error", async () => {
  const { ctx } = mockCtx([{ status: 200, body: { data: [] } }], conn);
  const result = await listDocuments.execute({ doctype: "Lead" }, ctx);
  assertEquals(result, { records: [], count: 0 });
});

Deno.test("list-documents: is declared read, not perform", () => {
  assertEquals(listDocuments.type, "read");
});
