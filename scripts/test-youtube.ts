import { setTimeout as delay } from 'node:timers/promises';
import { createClient } from '@supabase/supabase-js';
import { config as loadDotEnv } from 'dotenv';
import { buildYoutubeAnalysisInput } from '@/lib/analysis-input';
import { fetchYoutubeTranscript } from '@/lib/youtube/transcript';

loadDotEnv({ path: '.env', quiet: true });

async function main(): Promise<void> {
const args = process.argv.slice(2).filter((argument) => argument !== '--');
const videoUrl = args.find((argument) => /^https?:\/\//i.test(argument));
const languageIndex = args.indexOf('--lang');
const outputLanguage = languageIndex >= 0 ? args[languageIndex + 1] : 'es';
if (!videoUrl) {
  console.error('Uso: pnpm test:youtube -- <URL_DE_YOUTUBE> [--lang es|en]');
  process.exit(2);
}
if (outputLanguage !== 'es' && outputLanguage !== 'en') {
  console.error('El idioma debe ser es o en.');
  process.exit(2);
}

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !supabaseKey) {
  throw new Error('Faltan SUPABASE_URL y SUPABASE_SECRET_KEY/SUPABASE_SERVICE_ROLE_KEY en .env');
}

console.log('1/4 Obteniendo transcript de YouTube...');
const transcript = await fetchYoutubeTranscript(videoUrl);
const input = buildYoutubeAnalysisInput(videoUrl, transcript, outputLanguage);
console.log(`2/4 Transcript listo: ${input.transcript.segments.length} segmentos, ${Math.round(input.source.durationSeconds ?? 0)} s.`);
console.log(`    Video: ${input.source.title}`);
console.log(`    Canal: ${input.source.channel.name}`);
console.log(`    Idioma de salida: ${input.options.outputLanguage}`);

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false, autoRefreshToken: false },
  global: { headers: { 'User-Agent': 'motor-analysis-terminal-test/0.1' } },
});
const { data: created, error: insertError } = await supabase
  .from('analyses')
  .insert({ input, status: 'queued', progress: 0 })
  .select('id, status, progress')
  .single();
if (insertError || !created) {
  throw new Error(`No se pudo encolar el análisis: ${insertError?.message ?? 'respuesta vacía'}`);
}

console.log(`3/4 Trabajo encolado: ${created.id}`);
console.log('    Esperando al worker...');

const finalStatuses = new Set(['completed', 'partial', 'needs_review', 'failed']);
const deadline = Date.now() + 12 * 60_000;
let previousSnapshot = '';

while (Date.now() < deadline) {
  const { data, error } = await supabase
    .from('analyses')
    .select('id, status, progress, public_diagnosis, last_error, completed_at')
    .eq('id', created.id)
    .single();
  if (error || !data) throw new Error(`No se pudo consultar el análisis: ${error?.message ?? 'respuesta vacía'}`);

  const snapshot = `${data.status}:${data.progress}`;
  if (snapshot !== previousSnapshot) {
    console.log(`    ${String(data.status).padEnd(14)} ${String(data.progress).padStart(3)}%`);
    previousSnapshot = snapshot;
  }

  if (finalStatuses.has(data.status)) {
    if (data.status === 'failed') throw new Error(`El análisis falló: ${data.last_error ?? 'sin detalle'}`);
    console.log(`4/4 Diagnóstico terminado con estado: ${data.status}`);
    console.log(JSON.stringify(data.public_diagnosis, null, 2));
    process.exit(0);
  }

  await delay(3_000);
}

throw new Error(`La prueba superó el tiempo límite. ID del trabajo: ${created.id}`);
}

void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
