import { assertEquals } from "@std/assert";
import customFieldCreate from "../../actions/custom-field-create.ts";
import { bodyOf, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("custom-field-create: POSTs /beta/workspaces/{id}/custom-fields", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "cf1", type: "text" } }]);
  await customFieldCreate.execute({ workspaceId: "ws1", name: "Owner", type: "text" }, ctx);

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/beta/workspaces/ws1/custom-fields");
  assertEquals(calls[0].headers["content-type"], "application/json");
  // `type` going in; the list endpoint returns the same value under `field`.
  assertEquals(bodyOf(calls[0]), { name: "Owner", type: "text" });
});

Deno.test("custom-field-create: metadata is sent as parsed JSON when supplied", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await customFieldCreate.execute({
    workspaceId: "ws1",
    name: "Stage",
    type: "select",
    metadata: '{"options":[{"value":"Red","color":"#ff0000"}]}',
  }, ctx);

  assertEquals(bodyOf(calls[0]), {
    name: "Stage",
    type: "select",
    metadata: { options: [{ value: "Red", color: "#ff0000" }] },
  });
});

/** The twelve documented types, in the vendor's own casing. */
Deno.test("custom-field-create: offers exactly Motion's twelve field types", () => {
  const values = ((customFieldCreate.params?.find((p) => p.key === "type")?.options ??
    []) as Array<{ value: string }>).map((o) => o.value);
  assertEquals(values, [
    "text",
    "url",
    "date",
    "person",
    "multiPerson",
    "phone",
    "select",
    "multiSelect",
    "number",
    "email",
    "checkbox",
    "relatedTo",
  ]);
  assertEquals(customFieldCreate.idempotent, false);
});
