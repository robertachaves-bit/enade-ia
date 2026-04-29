import React, { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';
import { Download, Loader2, Copy, Check } from 'lucide-react';

interface MermaidProps {
  chart: string;
}

mermaid.initialize({
  startOnLoad: false,
  theme: 'neutral',
  securityLevel: 'loose',
  fontFamily: 'Inter, sans-serif',
});

export const Mermaid: React.FC<MermaidProps> = ({ chart }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (ref.current && chart) {
      const renderChart = async () => {
        try {
          const id = `mermaid-${Math.random().toString(36).substr(2, 9)}`;
          const { svg } = await mermaid.render(id, chart);
          if (ref.current) {
            ref.current.innerHTML = svg;
          }
        } catch (err) {
          console.error('Mermaid render error:', err);
        }
      };
      renderChart();
    }
  }, [chart]);

  const getCanvas = async (): Promise<HTMLCanvasElement | null> => {
    if (!ref.current) return null;
    const svgElement = ref.current.querySelector('svg');
    if (!svgElement) return null;

    const svgData = new XMLSerializer().serializeToString(svgElement);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    // Use data URL instead of Blob to avoid tainting in some environments
    const svgBase64 = btoa(unescape(encodeURIComponent(svgData)));
    const url = `data:image/svg+xml;base64,${svgBase64}`;

    return new Promise((resolve) => {
      img.onload = () => {
        const svgSize = svgElement.getBBox();
        const padding = 40;
        canvas.width = svgSize.width + padding * 2;
        canvas.height = svgSize.height + padding * 2;

        if (ctx) {
          ctx.fillStyle = 'white';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, padding, padding);
          resolve(canvas);
        } else {
          resolve(null);
        }
      };
      img.onerror = () => resolve(null);
      img.src = url;
    });
  };

  const downloadAsImage = async () => {
    setIsExporting(true);
    const canvas = await getCanvas();
    if (canvas) {
      const pngUrl = canvas.toDataURL('image/png');
      const downloadLink = document.createElement('a');
      downloadLink.href = pngUrl;
      downloadLink.download = `diagrama-enade-ia-${Date.now()}.png`;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
    }
    setIsExporting(false);
  };

  const copyToClipboard = async () => {
    const canvas = await getCanvas();
    if (canvas) {
      try {
        canvas.toBlob(async (blob) => {
          if (blob) {
            const item = new ClipboardItem({ 'image/png': blob });
            await navigator.clipboard.write([item]);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          }
        }, 'image/png');
      } catch (err) {
        console.error('Copy to clipboard failed:', err);
      }
    }
  };

  return (
    <div className="relative group">
      <div 
        ref={ref} 
        className="flex justify-center p-8 bg-white rounded-ui border border-[#E5E2DD] overflow-x-auto min-h-[100px]" 
      />
      <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-all print:hidden">
        <button
          onClick={copyToClipboard}
          className="p-2 bg-white border border-[#E5E2DD] rounded-ui shadow-sm text-text-secondary hover:text-action transition-all flex items-center gap-2"
          title="Copiar para o Word"
        >
          {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
          <span className="text-[10px] font-bold uppercase">{copied ? 'PRONTO!' : 'COPIAR'}</span>
        </button>
        <button
          onClick={downloadAsImage}
          disabled={isExporting}
          className="p-2 bg-white border border-[#E5E2DD] rounded-ui shadow-sm text-text-secondary hover:text-action transition-all disabled:opacity-50"
          title="Baixar imagem"
        >
          {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
};
