import { assertEquals } from "@std/assert";
import boxCreate from "../../actions/box-create.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("box-create: POSTs a JSON body", async () => {
  const { ctx, calls } = mockCtx([{ body: { key: "b1", name: "FooBox" } }]);
  await boxCreate.execute({ pipelineKey: "p1", name: "FooBox" }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/api/v1/pipelines/p1/boxes");
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(JSON.parse(calls[0].body!), { name: "FooBox" });
});

/**
 * `assignedToSharingEntries` must arrive as a JSON ARRAY-OF-OBJECTS ENCODED
 * AS A STRING — the vendor's own documented example is
 * `[{"email":"ginny@weasley.com"}]` as the *value* of a `string`-typed
 * property. Sending a real nested array here is a silent 400.
 */
Deno.test("box-create: assignedToEmails is JSON-string-encoded, not a nested array", async () => {
  const { ctx, calls } = mockCtx([{ body: { key: "b1" } }]);
  await boxCreate.execute(
    { pipelineKey: "p1", name: "FooBox", assignedToEmails: ["a@x.com", "b@x.com"] },
    ctx,
  );
  const body = JSON.parse(calls[0].body!) as { assignedToSharingEntries: unknown };
  assertEquals(typeof body.assignedToSharingEntries, "string");
  assertEquals(
    JSON.parse(body.assignedToSharingEntries as string),
    [{ email: "a@x.com" }, { email: "b@x.com" }],
  );
});

Deno.test("box-create: an empty assignedToEmails list omits the field entirely", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await boxCreate.execute({ pipelineKey: "p1", name: "FooBox", assignedToEmails: [] }, ctx);
  const body = JSON.parse(calls[0].body!) as Record<string, unknown>;
  assertEquals("assignedToSharingEntries" in body, false);
});
