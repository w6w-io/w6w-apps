/** The connection shape every Zuora action test uses. */
export const display = { region: "us-cloud2" };

/** One page of Zuora's Object Query `{data, nextPage}` envelope. */
export const page = (data: unknown[], nextPage: string | null = null) => ({
  status: 200,
  body: { data, nextPage },
});

/** A bare object response, for the classic `/v1/*` per-key endpoints. */
export const one = (body: unknown) => ({ status: 200, body });

/** A Zuora v1 error body: `{success: false, processId, reasons}`. */
export const v1Error = (code: number, message: string, status = 400) => ({
  status,
  body: { success: false, processId: "p-test", reasons: [{ code, message }] },
});
