import { assert, assertEquals, assertThrows } from "@std/assert";
import createNote from "../../actions/create-note.ts";
import { bodyOf, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("create-note: POSTs a plain note with the required trio", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: 3 } }]);
  await createNote.execute({ candidateId: 1, body: "Great call" }, ctx);

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v3/notes");
  assertEquals(bodyOf(calls[0]), {
    candidate_id: 1,
    body: "Great call",
    note_type: "NOTE",
    visibility: "public",
  });
});

/**
 * Thirteen note types are readable and exactly three are creatable — the rest are
 * produced by Greenhouse features. Offering all thirteen here would be a form
 * that 422s on ten of its own options.
 */
Deno.test("create-note: offers only the three creatable types", () => {
  const options = (createNote.params ?? []).find((p) => p.key === "noteType")?.options;
  assertEquals(
    (options as Array<{ value: string }>).map((o) => o.value),
    ["NOTE", "ACTIVITY", "EMAIL"],
  );
});

/** The create side spells visibility differently from the read side. */
Deno.test("create-note: uses the write-side visibility vocabulary", () => {
  const options = (createNote.params ?? []).find((p) => p.key === "visibility")?.options;
  assertEquals(
    (options as Array<{ value: string }>).map((o) => o.value),
    ["public", "private", "admin_only"],
  );
});

Deno.test("create-note: an e-mail note sends all four required e-mail fields", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: 3 } }]);
  await createNote.execute({
    candidateId: 1,
    noteType: "EMAIL",
    subject: "Interview follow-up",
    body: "Thanks for your time",
    emailFrom: "recruiter@acme.com",
    emailTo: "ada@example.com, hm@acme.com",
    emailCc: "",
  }, ctx);

  assertEquals(bodyOf(calls[0]), {
    candidate_id: 1,
    body: "Thanks for your time",
    note_type: "EMAIL",
    visibility: "public",
    subject: "Interview follow-up",
    email_from: ["recruiter@acme.com"],
    email_to: ["ada@example.com", "hm@acme.com"],
    // Required to be PRESENT but permitted to be empty — Greenhouse rejects its
    // absence, not its emptiness.
    email_cc: [],
  });
});

Deno.test("create-note: an e-mail note without a subject fails locally", () => {
  const { ctx } = mockCtx([]);
  assertThrows(
    () =>
      createNote.execute({
        candidateId: 1,
        noteType: "EMAIL",
        body: "x",
        emailFrom: "a@b.com",
        emailTo: "c@d.com",
      }, ctx),
    Error,
    "requires a subject",
  );
});

Deno.test("create-note: an e-mail note without From or To fails locally", () => {
  const { ctx } = mockCtx([]);
  assertThrows(
    () =>
      createNote.execute({
        candidateId: 1,
        noteType: "EMAIL",
        subject: "s",
        body: "x",
        emailFrom: "a@b.com",
      }, ctx),
    Error,
    "From and To",
  );
});

/**
 * The conditional cuts both ways in the vendor's schema: the e-mail fields are
 * required on an EMAIL note and forbidden on the others.
 */
Deno.test("create-note: e-mail fields on a plain note are refused, not silently dropped", () => {
  const { ctx, calls } = mockCtx([]);
  const err = assertThrows(
    () =>
      createNote.execute({
        candidateId: 1,
        noteType: "NOTE",
        body: "x",
        emailTo: "c@d.com",
      }, ctx),
    Error,
  );
  assert(err.message.includes("only accepted"), err.message);
  assertEquals(calls.length, 0);
});

Deno.test("create-note: is honestly declared non-idempotent", () => {
  assertEquals(createNote.idempotent, false);
});
