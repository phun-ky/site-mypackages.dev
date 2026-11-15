export type HttpErrorKind =
  'rate_limited' | 'upstream' | 'client' | 'network' | 'unknown';

const kindForStatus = (status: number): HttpErrorKind => {
  if (status === 429) return 'rate_limited';

  if (status >= 500) return 'upstream';

  if (status >= 400) return 'client';

  return 'unknown';
};

export class HttpError extends Error {
  public readonly name = 'HttpError';

  constructor(
    public readonly status: number,
    public readonly url: string,
    options?: {
      message?: string; // user-friendly / app-friendly
      body?: string; // raw upstream body (debug)
      retryAfterSeconds?: number;
      kind?: HttpErrorKind;
    }
  ) {
    const msg = options?.message ?? `HTTP ${status} for ${url}`;

    super(msg);

    this.body = options?.body;
    this.retryAfterSeconds = options?.retryAfterSeconds;
    this.kind = options?.kind ?? kindForStatus(status);
  }

  public readonly body?: string;
  public readonly retryAfterSeconds?: number;
  public readonly kind: HttpErrorKind;
}
