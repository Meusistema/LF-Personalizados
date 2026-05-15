/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export type PaperFormat = '58mm' | '80mm' | 'a4' | 'a6' | 'custom' | 'thermal';

interface PrintOptions {
  format: PaperFormat;
  orientation?: 'portrait' | 'landscape';
  customWidth?: number;
  customHeight?: number;
  margin?: number;
  fileName?: string;
}

export const PrintService = {
  /**
   * Get dimensions in mm for a given format
   */
  getDimensions(options: PrintOptions) {
    const { format, orientation = 'portrait', customWidth, customHeight } = options;
    const isLandscape = orientation === 'landscape';

    switch (format) {
      case '58mm':
        return { width: 58, height: customHeight || 0 };
      case '80mm':
        return { width: 80, height: customHeight || 0 };
      case 'a4':
        return isLandscape ? { width: 297, height: 210 } : { width: 210, height: 297 };
      case 'a6':
        return isLandscape ? { width: 148.5, height: 105 } : { width: 105, height: 148.5 };
      case 'custom':
      case 'thermal':
        return { width: customWidth || 80, height: customHeight || 0 };
      default:
        return { width: 80, height: 0 };
    }
  },

  /**
   * Get dynamic CSS string for printing
   */
  getPrintStyles(options: PrintOptions) {
    const { width, height } = this.getDimensions(options);
    const pageSize = height > 0 ? `${width}mm ${height}mm` : `${width}mm auto`;
    
    // Scale factor calculation:
    // If the content was designed for 80mm but we are printing on 58mm, 
    // we need to scale everything down.
    // However, most modern browsers handle scaling via width: 100%.
    // The key is to ensure the viewport and @page size match.

    return `
      @media print {
        @page {
          size: ${pageSize};
          margin: 0;
        }
        * {
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
          box-sizing: border-box;
        }
        body {
          margin: 0 !important;
          padding: 0 !important;
          background-color: white !important;
          width: ${width}mm !important;
        }
        .print-canvas {
          width: ${width}mm !important;
          margin: 0 auto !important;
          overflow: hidden !important;
        }
        /* Scale-to-Fit implementation */
        .scale-to-fit {
          width: 100% !important;
          height: auto !important;
          display: block !important;
        }
        .scale-to-fit img, 
        .scale-to-fit canvas, 
        .scale-to-fit svg {
          max-width: 100% !important;
          height: auto !important;
        }
        .no-print {
          display: none !important;
        }
      }
    `;
  },

  /**
   * Inject dynamic CSS for printing into the current document
   */
  injectPrintStyles(options: PrintOptions) {
    const styleId = 'dynamic-print-styles';
    let styleElement = document.getElementById(styleId) as HTMLStyleElement;

    if (!styleElement) {
      styleElement = document.createElement('style');
      styleElement.id = styleId;
      document.head.appendChild(styleElement);
    }

    styleElement.innerHTML = this.getPrintStyles(options);
  },

  /**
   * Print an element using the browser's print dialog or Electron API
   */
  async printElement(elementId: string, options: PrintOptions) {
    const element = document.getElementById(elementId);
    if (!element) return;

    this.injectPrintStyles(options);

    if ((window as any).electronAPI) {
      const styles = this.getPrintStyles(options);
      const htmlContent = `
        <html>
          <head>
            <style>${styles}</style>
          </head>
          <body>
            <div class="print-canvas">
              ${element.innerHTML}
            </div>
          </body>
        </html>
      `;
      
      const { width, height } = this.getDimensions(options);
      const printOptions: any = {
        silent: true,
        printBackground: true,
        margins: { marginType: 'none' },
        scaleFactor: 100
      };

      if (options.format === 'a4') {
        printOptions.pageSize = 'A4';
      } else if (options.format === 'a6') {
        printOptions.pageSize = { width: 105000, height: 148500 };
      } else if (width && height) {
        printOptions.pageSize = { width: width * 1000, height: height * 1000 };
      } else if (width) {
        printOptions.pageSize = { width: width * 1000, height: 2000000 };
      }

      if (options.orientation) {
        printOptions.landscape = options.orientation === 'landscape';
      }

      return (window as any).electronAPI.print(htmlContent, printOptions);
    }

    // Add temporary classes for printing
    const originalClasses = element.className;
    element.classList.add('print-container', 'scale-to-fit');

    // Hide all other elements
    const others = document.body.children;
    const hiddenElements: HTMLElement[] = [];
    for (let i = 0; i < others.length; i++) {
      const el = others[i] as HTMLElement;
      if (el !== element && !el.classList.contains('no-print')) {
        el.classList.add('no-print');
        hiddenElements.push(el);
      }
    }

    window.print();

    // Restoration
    element.className = originalClasses;
    hiddenElements.forEach(el => el.classList.remove('no-print'));
  },

  /**
   * Generate and download a PDF
   */
  async generatePDF(elementId: string, options: PrintOptions) {
    const element = document.getElementById(elementId);
    if (!element) return;

    const { width, height } = this.getDimensions(options);
    
    // Create a temporary container for capture to avoid layout shifts in UI
    const clone = element.cloneNode(true) as HTMLElement;
    clone.style.width = `${width}mm`;
    clone.style.position = 'fixed';
    clone.style.left = '-9999px';
    clone.style.top = '0';
    clone.style.transform = 'none'; // Ensure no scale is applied
    clone.classList.remove('no-print');
    clone.classList.add('scale-to-fit');
    document.body.appendChild(clone);

    try {
      const canvas = await html2canvas(clone, {
        scale: 2, // High quality
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        width: clone.offsetWidth,
        height: clone.offsetHeight
      });

      const imgData = canvas.toDataURL('image/png');
      
      // Calculate dynamic height if auto
      const pdfHeight = height > 0 ? height : (canvas.height * width) / canvas.width;
      
      const pdf = new jsPDF({
        orientation: options.orientation || 'portrait',
        unit: 'mm',
        format: height > 0 ? [width, height] : [width, pdfHeight]
      });

      pdf.addImage(imgData, 'PNG', 0, 0, width, pdfHeight);
      pdf.save(`${options.fileName || 'document'}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
    } finally {
      document.body.removeChild(clone);
    }
  }
};
