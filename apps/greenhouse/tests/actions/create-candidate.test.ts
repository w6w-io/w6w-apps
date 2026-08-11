import { assert, assertEquals } from "@std/assert";
import createCandidate from "../../actions/create-candidate.ts";
import { bodyOf, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("create-candidate: POSTs the two required fields and nothing else", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: 9, first_name: "Ada" } }]);
  const out = await createCandidate.execute({ firstName: "Ada", lastName: "Lovelace" }, ctx) as {
    id: number;
  };

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v3/candidates");
  assertEquals(bodyOf(calls[0]), { first_name: "Ada", last_name: "Lovelace" });
  assertEquals(out.id, 9);
});

/** Greenhouse requires a `type` alongside every contact value. */
Deno.test("create-candidate: contact details are sent as typed value objects", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: 9 } }]);
  await createCandidate.execute({
    firstName: "Ada",
    lastName: "Lovelace",
    emailAddress: "ada@example.com",
    phoneNumber: "+15551234567",
    tags: " referral , 2026 ",
  }, ctx);

  assertEquals(bodyOf(calls[0]), {
    first_name: "Ada",
    last_name: "Lovelace",
    email_addresses: [{ value: "ada@example.com", type: "personal" }],
    phone_numbers: [{ value: "+15551234567", type: "mobile" }],
    tags: ["referral", "2026"],
  });
});

/**
 * The documented single-call path: Greenhouse's own guidance is to nest an
 * `application` here rather than create the person and then the application, so
 * a failure cannot leave a candidate behind.
 */
Deno.test("create-candidate: a job id nests the documented application object", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: 9 } }]);
  await createCandidate.execute({
    firstName: "Ada",
    lastName: "Lovelace",
    jobId: 77,
    sourceId: 3,
    recruiterId: 4,
    coordinatorId: 5,
  }, ctx);

  assertEquals(bodyOf(calls[0]).application, {
    job_id: 77,
    source_id: 3,
    recruiter_id: 4,
    coordinator_id: 5,
  });
});

Deno.test("create-candidate: no job id means no application key at all", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: 9 } }]);
  await createCandidate.execute({ firstName: "Ada", lastName: "Lovelace", sourceId: 3 }, ctx);
  assertEquals(bodyOf(calls[0]).application, undefined);
});

/**
 * Harvest v3 accepts no idempotency key on any endpoint, so a retry creates a
 * second person. Declaring this retryable would let the runtime duplicate a
 * candidate on a dropped connection.
 */
Deno.test("create-candidate: is honestly declared non-idempotent", () => {
  assertEquals(createCandidate.idempotent, false);
});

Deno.test("create-candidate: the e-mail hint explains why it matters", () => {
  const param = (createCandidate.params ?? []).find((p) => p.key === "emailAddress");
  assert(param?.hint?.includes("find them again"), param?.hint);
});
