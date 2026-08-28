export interface GraphicFile {
  filename: string;
  blob: Blob;
}

/** Empaqueta las creatividades generadas en un .zip — jszip se carga solo aquí, al descargar. */
export async function buildGraphicsZip(files: GraphicFile[]): Promise<Blob> {
  const { default: JSZip } = await import("jszip");
  const zip = new JSZip();
  for (const file of files) zip.file(file.filename, file.blob);
  return zip.generateAsync({ type: "blob" });
}
