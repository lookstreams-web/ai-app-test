-- Bucket privado para el audio transitorio de la entrada por voz.
-- Solo lo acceden la web y el worker con la clave de servidor (service role,
-- que salta RLS); sin políticas, el bucket queda denegado por defecto para
-- clientes anónimos o autenticados. Los límites de tamaño y tipo duplican la
-- validación del endpoint como defensa a nivel de storage.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'analysis-audio',
  'analysis-audio',
  false,
  52428800, -- 50MB, igual que MAX_AUDIO_BYTES en lib/analysis-input.ts
  array['audio/webm', 'audio/mp4', 'audio/mpeg', 'audio/ogg', 'audio/wav']
)
on conflict (id) do nothing;
