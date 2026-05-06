/**
 * Converts a PDF file's first page to a PNG blob using pdfjs-dist.
 * Runs entirely in the browser — no server-side dependencies needed.
 */
export async function convertPdfToImage(file: File): Promise<Blob> {
  const pdfjsLib = await import('pdfjs-dist')
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url,
  ).toString()

  const arrayBuffer = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
  const page = await pdf.getPage(1) // Only first page

  const viewport = page.getViewport({ scale: 200 / 72 }) // 200 DPI
  const canvas = document.createElement('canvas')
  canvas.width = viewport.width
  canvas.height = viewport.height
  await page.render({ canvas, viewport }).promise

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob)
      else reject(new Error('Failed to convert PDF to image'))
    }, 'image/png')
  })
}
