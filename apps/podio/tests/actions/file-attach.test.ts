import { assertEquals } from "@std/assert";
import fileAttach from "../../actions/file-attach.ts";
import { bodyOf, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("file-attach: POSTs the reference to the attach endpoint", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  const out = await fileAttach.execute({ fileId: "555", refType: "item", refId: "9" }, ctx);
  assertEquals(out, { status: 204 });
  assertEquals(pathOf(calls[0].url), "/file/555/attach");
  assertEquals(calls[0].method, "POST");
  assertEquals(bodyOf(calls[0]), { ref_type: "item", ref_id: "9" });
  assertEquals(queryOf(calls[0].url), {});
});

Deno.test("file-attach: the silent switch reaches the query string", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  await fileAttach.execute({ fileId: "555", refType: "task", refId: "5", silent: true }, ctx);
  assertEquals(queryOf(calls[0].url), { silent: "true" });
});

/** Podio: "Valid objects are status, item, comment, space, or task." */
Deno.test("file-attach: offers exactly the five attachable types Podio documents", () => {
  const refType = fileAttach.params!.find((p) => p.key === "refType")!;
  assertEquals(refType.validation?.enum, ["item", "comment", "task", "status", "space"]);
});

Deno.test("file-attach: is declared idempotent", () => {
  assertEquals(fileAttach.idempotent, true);
  assertEquals(fileAttach.type, "perform");
});
