import { assertEquals } from "@std/assert";
import activityCreate from "../../actions/activity-create.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("activity-create: POSTs the note", async () => {
  const { ctx, calls } = mockCtx([{ body: { jnid: "n1" } }]);
  await activityCreate.execute({ note: "My new note", record_type_name: "Note" }, ctx);

  assertEquals(pathOf(calls[0].url), "/api1/activities");
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), { note: "My new note", record_type_name: "Note" });
});

Deno.test("activity-create: related_jnid becomes the primary.id JobNimbus expects", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await activityCreate.execute({ note: "My new note", related_jnid: "i97" }, ctx);

  const body = JSON.parse(calls[0].body!);
  assertEquals(body.primary, { id: "i97" });
  assertEquals("related_jnid" in body, false);
});

Deno.test("activity-create: record_type_name defaults to Note", () => {
  const field = (activityCreate.params ?? []).find((p) => p.key === "record_type_name");
  assertEquals(field?.default, "Note");
});

Deno.test("activity-create: is not marked idempotent", () => {
  assertEquals(activityCreate.idempotent, false);
});
