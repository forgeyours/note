/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Load PDF.js from highly-available CDN dynamically to avoid complex local compilation
export function loadPDFJS(): Promise<any> {
  return new Promise((resolve, reject) => {
    if ((window as any).pdfjsLib) {
      resolve((window as any).pdfjsLib);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.min.js';
    script.onload = () => {
      const pdfjsLib = (window as any).pdfjsLib;
      pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';
      resolve(pdfjsLib);
    };
    script.onerror = (err) => reject(new Error('Failed to load PDF.js SDK: ' + err));
    document.head.appendChild(script);
  });
}

export interface PDFPageDetails {
  pageNumber: number;
  dataUrl: string; // Base64 image of the rendered page
  width: number;
  height: number;
}

/**
 * Parses a PDF file and returns the base64 list of high resolution pages to be stored as canvas backgrounds
 */
export async function extractPDFPages(file: File): Promise<PDFPageDetails[]> {
  const pdfjsLib = await loadPDFJS();
  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  const pdf = await loadingTask.promise;

  const results: PDFPageDetails[] = [];
  const targetWidth = 800; // standard A4 scaling width

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale: 1.5 }); // High-res render scale
    
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    
    if (context) {
      // Scale viewport to a friendly display width (e.g. 800px)
      const displayScale = targetWidth / viewport.width;
      const scaledViewport = page.getViewport({ scale: 1.5 * displayScale });

      canvas.width = scaledViewport.width;
      canvas.height = scaledViewport.height;

      const renderContext = {
        canvasContext: context,
        viewport: scaledViewport,
      };

      await page.render(renderContext).promise;
      const dataUrl = canvas.toDataURL('image/png');
      
      results.push({
        pageNumber: i,
        dataUrl,
        width: scaledViewport.width,
        height: scaledViewport.height
      });
    }
  }

  return results;
}
