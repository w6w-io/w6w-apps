import { assert, assertEquals, assertRejects } from "@std/assert";
import deleteDocument from "../../actions/delete-document.ts";
import { mockCtx } from "../_helpers.ts";

const conn = { display: { baseUrl: "https://erpnext.example.com" } };

Deno.test("delete-document: DELETEs by doctype and name once confirmed", async () => {
  const { ctx, calls } = mockCtx([{ status: 202, body: { message: "ok" } }], conn);
  const result = await deleteDocument.execute(
    { doctype: "ToDo", name: "abc123", confirm: true },
    ctx,
  );
  assertEquals(calls[0].url, "https://erpnext.example.com/api/resource/ToDo/abc123");
  assertEquals(calls[0].method, "DELETE");
  assertEquals(result, { deleted: true });
});

Deno.test("delete-document: refuses without confirm, before any request", async () => {
  const { ctx, calls } = mockCtx([], conn);
  const err = await assertRejects(
    async () =>
      await deleteDocument.execute({ doctype: "ToDo", name: "abc123", confirm: false }, ctx),
    Error,
  );
  assert(err.message.includes("cannot be undone"), err.message);
  assertEquals(calls.length, 0);
});

Deno.test("delete-document: an end state that looks idempotent still is not", () => {
  assertEquals(deleteDocument.idempotent, false);
});

Deno.test("delete-document: the confirm param is required", () => {
  const confirm = (deleteDocument.params as Array<{ key: string; required?: boolean }>)
    .find((p) => p.key === "confirm");
  assert(confirm, "delete-document has no confirmation flag");
  assertEquals(confirm!.required, true);
});
