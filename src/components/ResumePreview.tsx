import { useEffect, useState } from "react";
import * as pdfjsLib from "pdfjs-dist";
import mammoth from "mammoth";
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

interface ResumePreviewProps {
  file: File | null;
}

function isPdf(file: File) {
  return (
    file.type.toLowerCase().includes("pdf") ||
    file.name.toLowerCase().endsWith(".pdf")
  );
}

export default function ResumePreview({ file }: ResumePreviewProps) {
  const [canvas, setCanvas] = useState<HTMLCanvasElement | null>(null);
  const [html, setHtml] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setCanvas(null);
    setHtml("");
    setError(null);

    if (!file) return;

    const renderPreview = async () => {
      try {
        const arrayBuffer = await file.arrayBuffer();
        if (isPdf(file)) {
          const pdf = await pdfjsLib.getDocument({
            data: new Uint8Array(arrayBuffer),
            disableStream: true,
            disableRange: true,
          }).promise;
          const page = await pdf.getPage(1);
          const viewport = page.getViewport({ scale: 1.5 });
          const nextCanvas = document.createElement("canvas");
          nextCanvas.width = viewport.width;
          nextCanvas.height = viewport.height;
          await page.render({ canvas: nextCanvas, viewport }).promise;
          if (!cancelled) setCanvas(nextCanvas);
          return;
        }

        const result = await mammoth.convertToHtml({ arrayBuffer });
        if (!cancelled) setHtml(result.value);
      } catch (previewError) {
        if (!cancelled) {
          setError(
            previewError instanceof Error
              ? previewError.message
              : "Preview unavailable",
          );
        }
      }
    };

    renderPreview();
    return () => {
      cancelled = true;
    };
  }, [file]);

  if (!file) return null;

  return (
    <div className="rounded border border-gray-200 dark:border-dark-border overflow-hidden bg-white dark:bg-dark-card">
      {canvas && (
        <img
          src={canvas.toDataURL("image/png")}
          alt={`Preview of ${file.name}`}
          className="block w-full h-80 object-cover object-top"
        />
      )}
      {html && (
        <div
          className="prose prose-sm max-w-none h-80 overflow-hidden p-4 text-gray-800 dark:text-gray-200"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      )}
      {!canvas && !html && !error && (
        <div className="h-80 flex items-center justify-center text-xs text-gray-500 dark:text-dark-text-secondary">
          Loading preview...
        </div>
      )}
      {error && (
        <div className="h-80 flex items-center justify-center p-4 text-center text-xs text-gray-500 dark:text-dark-text-secondary">
          Preview unavailable for this file
        </div>
      )}
    </div>
  );
}
