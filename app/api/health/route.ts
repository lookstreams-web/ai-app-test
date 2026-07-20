export const runtime = 'nodejs';

export async function GET() {
  return Response.json({ ok: true, service: 'ai-app-test', ts: new Date().toISOString() });
}
