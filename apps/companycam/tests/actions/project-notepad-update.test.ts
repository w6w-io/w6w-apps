import { assertEquals } from "@std/assert";
import projectNotepadUpdate from "../../actions/project-notepad-update.ts";
import { bodyOf, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("project-notepad-update: replaces the notepad with a flat body", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { notepad: "Roof measured" } }]);
  const result = await projectNotepadUpdate.execute(
    { projectId: "1", notepad: "Roof measured" },
    ctx,
  ) as { notepad: string };
  assertEquals(pathOf(calls[0].url), "/v2/projects/1/notepad");
  assertEquals(calls[0].method, "PUT");
  assertEquals(bodyOf(calls[0]), { notepad: "Roof measured" });
  assertEquals(result.notepad, "Roof measured");
});

Deno.test("project-notepad-update: warns that it overwrites rather than appends", () => {
  const notepad = projectNotepadUpdate.params!.find((p) => p.key === "notepad")!;
  assertEquals(/Replaces the entire notepad/.test(notepad.hint!), true);
});
