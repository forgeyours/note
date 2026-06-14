/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { memo } from 'react';
import { Page } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

interface PDFBackgroundProps {
  pdfSource: string | null;
  zoom: number;
  pdfPage?: number | null;
}

const PDFBackground = memo(function PDFBackground({ pdfSource, zoom, pdfPage }: PDFBackgroundProps) {
  if (!pdfSource) return null;

  const isPdfFile = pdfSource.startsWith('data:application/pdf');

  return (
    <div 
      className="absolute inset-0 select-none z-5"
      style={{
        width: `${800 * zoom}px`,
        height: `${1130 * zoom}px`,
        pointerEvents: isPdfFile ? 'auto' : 'none',
      }}
    >
      {isPdfFile ? (
        <div className="w-full h-full overflow-hidden flex justify-center bg-white border-b border-gray-100">
          <Page 
            pageNumber={pdfPage || 1} 
            width={800 * zoom} 
            renderTextLayer={false} 
            renderAnnotationLayer={false} 
          />
        </div>
      ) : (
        <img
          src={pdfSource}
          alt="Annotated review background page"
          className="w-full h-full object-contain pointer-events-none select-none border-b border-gray-100"
          referrerPolicy="no-referrer"
        />
      )}
    </div>
  );
});

export default PDFBackground;
