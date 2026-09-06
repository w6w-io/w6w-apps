import { assert, assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/upload-document.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("upload-document: POSTs multipart/form-data to /company/documents", async () => {
  const { ctx, calls } = mockCtx([
    {
      status: 201,
      body: {
        success: true,
        data: {
          id: 1,
          type: "Document",
          attributes: {
            title: "Personio",
            employee: {
              type: "Employee",
              attributes: { id: { label: "ID", value: 1, type: "integer", universal_id: "id" } },
            },
          },
        },
      },
    },
  ]);
  const file = new Blob(["hello"], { type: "application/pdf" });

  const out = await action.execute(
    { employeeId: 1, categoryId: 2, title: "Personio", file },
    ctx,
  ) as { id: number; title: string; employee: Record<string, unknown> };

  assertEquals(pathOf(calls[0].url), "/v1/company/documents");
  assertEquals(calls[0].method, "POST");
  // multipart bodies are not JSON — this app never hand-builds the boundary itself.
  assert(calls[0].body?.includes("FormData"), calls[0].body ?? "");
  assertEquals(out.id, 1);
  assertEquals(out.title, "Personio");
  assertEquals(out.employee.id, 1);
});

Deno.test("upload-document: surfaces a 422 unsupported-file-type error", async () => {
  const { ctx } = mockCtx([
    {
      status: 422,
      body: { success: false, error: { message: "The given data was invalid.", code: 0 } },
    },
  ]);
  const file = new Blob(["x"]);
  await assertRejects(
    async () => await action.execute({ employeeId: 1, categoryId: 1, title: "t", file }, ctx),
    Error,
    "The given data was invalid.",
  );
});
