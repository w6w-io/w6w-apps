import { assert, assertEquals, assertRejects } from "@std/assert";
import createDocument from "../../actions/create-document.ts";
import { mockCtx } from "../_helpers.ts";

const conn = { display: { baseUrl: "https://erpnext.example.com" } };

Deno.test("create-document: POSTs the values and returns the created document", async () => {
  const { ctx, calls } = mockCtx([
    { status: 200, body: { data: { name: "CUST-0099", customer_name: "Acme Inc" } } },
  ], conn);
  const result = await createDocument.execute(
    { doctype: "Customer", values: { customer_name: "Acme Inc" } },
    ctx,
  );
  assertEquals(calls[0].url, "https://erpnext.example.com/api/resource/Customer");
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), { customer_name: "Acme Inc" });
  assertEquals(result, { document: { name: "CUST-0099", customer_name: "Acme Inc" } });
});

Deno.test("create-document: accepts Values as a raw JSON string", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { data: {} } }], conn);
  await createDocument.execute({ doctype: "Lead", values: '{"lead_name":"Jane"}' }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { lead_name: "Jane" });
});

Deno.test("create-document: refuses a non-object Values", async () => {
  const { ctx } = mockCtx([], conn);
  const err = await assertRejects(
    async () => await createDocument.execute({ doctype: "Lead", values: "[1,2,3]" }, ctx),
    Error,
  );
  assert(err.message.includes("must be a JSON object"), err.message);
});

Deno.test("create-document: is honest that a retry makes a second document", () => {
  assertEquals(createDocument.idempotent, false);
});
