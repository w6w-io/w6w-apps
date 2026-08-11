import { assert, assertEquals } from "@std/assert";
import hireApplication from "../../actions/hire-application.ts";
import { bodyOf, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("hire-application: POSTs to the hire endpoint and reports the 204", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  const out = await hireApplication.execute({ applicationId: 5 }, ctx);

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v3/applications/5/hire");
  assertEquals(bodyOf(calls[0]), {});
  assertEquals(out, { status: 204 });
});

Deno.test("hire-application: sends the opening, start date and close reason when given", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  await hireApplication.execute({
    applicationId: 5,
    openingId: 12,
    startDate: "2026-09-01T00:00:00Z",
    closeReasonId: 4,
  }, ctx);

  assertEquals(bodyOf(calls[0]), {
    opening_id: 12,
    start_date: "2026-09-01T00:00:00Z",
    close_reason_id: 4,
  });
});

/**
 * A hire is two operations: the application becomes `hired` and the named
 * opening closes. On a job with several open openings Greenhouse cannot guess
 * which slot is filled, which is why the field's hint says so.
 */
Deno.test("hire-application: the opening hint explains when it stops being optional", () => {
  const param = (hireApplication.params ?? []).find((p) => p.key === "openingId");
  assert(param?.hint?.includes("more than one open opening"), param?.hint);
});

Deno.test("hire-application: is honestly declared non-idempotent", () => {
  assertEquals(hireApplication.idempotent, false);
});

Deno.test("hire-application: a pasted path separator cannot escape the id segment", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  await hireApplication.execute({ applicationId: "5/../users" as unknown as number }, ctx);
  assertEquals(pathOf(calls[0].url), "/v3/applications/5%2F..%2Fusers/hire");
});
