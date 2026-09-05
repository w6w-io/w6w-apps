import { assertEquals, assertRejects } from "@std/assert";
import foldersAdd from "../../actions/folders-add.ts";
import { bodyOf, envelope, errorEnvelope, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("folders-add: posts the title and returns the created folder", async () => {
  const { ctx, calls } = mockCtx([{
    body: envelope([{ type: "folder", folder_id: 9, title: "New" }]),
  }]);
  const result = await foldersAdd.execute({ title: "New" }, ctx);

  assertEquals(pathOf(calls[0].url), "/api/1/folders/add");
  assertEquals(bodyOf(calls[0]), { title: "New" });
  assertEquals(result, { type: "folder", folder_id: 9, title: "New" });
});

Deno.test("folders-add: surfaces the documented duplicate-title error", async () => {
  const { ctx } = mockCtx([{
    status: 400,
    body: errorEnvelope(1251, "User already has a folder with this title"),
  }]);
  await assertRejects(async () => await foldersAdd.execute({ title: "New" }, ctx), Error, "1251");
});

Deno.test("folders-add: is not marked idempotent — a duplicate title errors instead of returning the existing folder", () => {
  assertEquals(foldersAdd.idempotent, false);
});
