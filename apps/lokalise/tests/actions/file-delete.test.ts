import { assertEquals } from "@std/assert";
import fileDelete from "../../actions/file-delete.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("file-delete: DELETEs a file by id", async () => {
  const { ctx, calls } = mockCtx([{ body: { project_id: "p1", file_deleted: true } }]);
  const out = await fileDelete.execute({ projectId: "p1", fileId: 33 }, ctx);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), "/api2/projects/p1/files/33");
  assertEquals(out, { project_id: "p1", file_deleted: true });
});

Deno.test("file-delete: surfaces the vendor's project-type-incompatibility error verbatim", async () => {
  const { ctx } = mockCtx([
    {
      status: 400,
      body: { error: { message: "Action not supported by this type of project", code: 400 } },
    },
  ]);
  await assertRejects(
    () => fileDelete.execute({ projectId: "p1", fileId: 1 }, ctx),
    "Action not supported by this type of project",
  );
});

Deno.test("file-delete: is idempotent", () => {
  assertEquals(fileDelete.idempotent, true);
});

async function assertRejects(fn: () => unknown, substring: string): Promise<void> {
  try {
    await fn();
    throw new Error("expected rejection");
  } catch (e) {
    if (!(e instanceof Error) || !e.message.includes(substring)) throw e;
  }
}
