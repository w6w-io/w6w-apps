import { assert, assertEquals, assertRejects } from "@std/assert";
import subscriberImport, { MAX_SUBSCRIBERS_PER_IMPORT } from "../../actions/subscriber-import.ts";
import { API_PATH, bodyOf, mockCtx, pathOf } from "../_helpers.ts";

const OK_BODY = {
  FailureDetails: [],
  TotalUniqueEmailsSubmitted: 3,
  TotalExistingSubscribers: 0,
  TotalNewSubscribers: 3,
  DuplicateEmailsInSubmission: [],
};

Deno.test("subscriber-import: POSTs to /subscribers/{listid}/import.json", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: OK_BODY }]);
  const out = await subscriberImport.execute({
    listId: "lid",
    subscribers: [{ EmailAddress: "a@b.com" }],
    consentToTrack: "Yes",
  }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), `${API_PATH}/subscribers/lid/import.json`);
  assertEquals(out, OK_BODY);
});

/** The batch-level consent is applied per subscriber, and a per-subscriber value wins. */
Deno.test("subscriber-import: batch consent fills in, per-subscriber consent overrides", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: OK_BODY }]);
  await subscriberImport.execute({
    listId: "lid",
    subscribers: [
      { EmailAddress: "a@b.com" },
      { EmailAddress: "c@d.com", ConsentToTrack: "No" },
    ],
    consentToTrack: "Yes",
  }, ctx);
  const subs = bodyOf(calls[0]).Subscribers as Array<Record<string, unknown>>;
  assertEquals(subs[0].ConsentToTrack, "Yes");
  assertEquals(subs[1].ConsentToTrack, "No");
});

Deno.test("subscriber-import: the three autoresponder/resubscribe flags default off", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: OK_BODY }]);
  await subscriberImport.execute({
    listId: "lid",
    subscribers: [{ EmailAddress: "a@b.com" }],
    consentToTrack: "Yes",
  }, ctx);
  const body = bodyOf(calls[0]);
  assertEquals(body.Resubscribe, false);
  assertEquals(body.QueueSubscriptionBasedAutoResponders, false);
  assertEquals(body.RestartSubscriptionBasedAutoresponders, false);
});

/** The 1000 ceiling is checked before the upload, so the error names the cause. */
Deno.test("subscriber-import: refuses an oversized batch without spending a request", async () => {
  const { ctx, calls } = mockCtx([]);
  const tooMany = Array.from(
    { length: MAX_SUBSCRIBERS_PER_IMPORT + 1 },
    (_, i) => ({ EmailAddress: `p${i}@example.com` }),
  );
  await assertRejects(
    async () =>
      await subscriberImport.execute(
        { listId: "lid", subscribers: tooMany, consentToTrack: "Yes" },
        ctx,
      ),
    Error,
    "at most 1000 subscribers",
  );
  assertEquals(calls.length, 0);
});

Deno.test("subscriber-import: refuses an empty batch", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () =>
      await subscriberImport.execute(
        { listId: "lid", subscribers: [], consentToTrack: "Yes" },
        ctx,
      ),
    Error,
    "non-empty",
  );
  assertEquals(calls.length, 0);
});

/**
 * The shape that surprises people: a PARTIAL success is a 400 whose ResultData
 * names each failed address. Discarding it would throw away the only record of
 * which addresses landed.
 */
Deno.test("subscriber-import: a partial-failure 400 keeps ResultData in the message", async () => {
  const { ctx } = mockCtx([{
    status: 400,
    body: {
      Code: 210,
      Message: "Subscriber Import had some failures",
      ResultData: {
        TotalUniqueEmailsSubmitted: 3,
        TotalExistingSubscribers: 2,
        TotalNewSubscribers: 0,
        DuplicateEmailsInSubmission: [],
        FailureDetails: [
          { EmailAddress: "example+1@example", Code: 1, Message: "Invalid Email Address" },
        ],
      },
    },
  }]);
  const err = await assertRejects(
    async () =>
      await subscriberImport.execute(
        { listId: "lid", subscribers: [{ EmailAddress: "a@b.com" }], consentToTrack: "Yes" },
        ctx,
      ),
    Error,
  );
  assert(err.message.includes("code 210"), err.message);
  assert(
    err.message.includes("example+1@example"),
    "the per-address failure detail must survive into the error: " + err.message,
  );
  assert(err.message.includes("TotalExistingSubscribers"), err.message);
});
