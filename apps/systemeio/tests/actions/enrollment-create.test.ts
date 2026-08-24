import { assertEquals } from "@std/assert";
import enrollmentCreate from "../../actions/enrollment-create.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("enrollment-create: POSTs to /api/school/courses/{courseId}/enrollments", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: 1, accessType: "full_access" } }]);
  await enrollmentCreate.execute(
    { courseId: 5, contactId: 42, accessType: "full_access" },
    ctx,
  );

  assertEquals(pathOf(calls[0].url), "/api/school/courses/5/enrollments");
  assertEquals(JSON.parse(calls[0].body!), { contactId: 42, accessType: "full_access" });
});

Deno.test("enrollment-create: includes modules when partial access is requested", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: 1 } }]);
  await enrollmentCreate.execute(
    { courseId: 5, contactId: 42, accessType: "partial_access", modules: [1, 2] },
    ctx,
  );

  assertEquals(
    JSON.parse(calls[0].body!),
    { contactId: 42, accessType: "partial_access", modules: [1, 2] },
  );
});
