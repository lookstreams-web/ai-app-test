// Formato de error acordado en el contrato: { error: { code, message } }.

export class HttpError extends Error {
  status: number;
  code: string;
  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
    this.name = 'HttpError';
  }
}

export function errorResponse(status: number, code: string, message: string): Response {
  return Response.json({ error: { code, message } }, { status });
}

// Convierte cualquier error en una Response HTTP consistente.
export function toErrorResponse(err: unknown): Response {
  if (err instanceof HttpError) {
    return errorResponse(err.status, err.code, err.message);
  }
  const message = err instanceof Error ? err.message : 'Error interno.';
  return errorResponse(500, 'INTERNAL_ERROR', message);
}
