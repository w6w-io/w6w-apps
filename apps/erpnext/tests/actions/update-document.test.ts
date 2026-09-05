import { assert, assertEquals, assertRejects } from "@std/assert";
import updateDocument from "../../actions/update-document.ts";
import { mockCtx } from "../_helpers.ts";

const conn = { display: { baseUrl: "https://erpnext.example.com" } };

Deno.test("update-document: PUTs only the given fields", async () => {
  const { ctx, calls } = mockCtx([
    { status: 200, body: { data: { name: "CUST-0001", status: "Closed" } } },
  ], conn);
  const result = await updateDocument.execute(
    { doctype: "Customer", name: "CUST-0001", values: { status: "Closed" } },
    ctx,
  );
  assertEquals(calls[0].url, "https://erpnext.example.com/api/resource/Customer/CUST-0001");
  assertEquals(calls[0].method, "PUT");
  assertEquals(JSON.parse(calls[0].body!), { status: "Closed" });
  assertEquals(result, { document: { name: "CUST-0001", status: "Closed" } });
});

Deno.test("update-document: refuses a non-object Values", async () => {
  const { ctx } = mockCtx([], conn);
  const err = await assertRejects(
    async () =>
      await updateDocument.execute({ doctype: "Customer", name: "CUST-0001", values: "5" }, ctx),
    Error,
  );
  assert(err.message.includes("must be a JSON object"), err.message);
});

Deno.test("update-document: writing the same values twice is safe", () => {
  assertEquals(updateDocument.idempotent, true);
});
