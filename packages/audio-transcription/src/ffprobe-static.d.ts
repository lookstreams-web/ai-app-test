// ffprobe-static no publica tipos: expone { path } con la ruta del binario.
declare module "ffprobe-static" {
  const ffprobe: { path: string };
  export default ffprobe;
}
