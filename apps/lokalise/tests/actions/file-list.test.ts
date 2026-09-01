import { assertEquals } from "@std/assert";
import fileList from "../../actions/file-list.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("file-list: lists a project's files, including the __unassigned__ pseudo-file", async () => {
  const { ctx, calls } = mockCtx([
    {
      body: {
        files: [{ file_id: 33, filename: "index.json" }, {
          file_id: -1,
          filename: "__unassigned__",
        }],
      },
    },
  ]);
  const out = await fileList.execute({ projectId: "p1", limit: 50 }, ctx) as { items: unknown[] };
  assertEquals(pathOf(calls[0].url), "/api2/projects/p1/files");
  assertEquals(out.items.length, 2);
});
