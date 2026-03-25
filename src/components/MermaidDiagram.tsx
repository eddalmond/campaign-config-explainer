import { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';

interface Props {
  code: string;
}

export default function MermaidDiagram({ code }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState<string>('');
  const [error, setError] = useState<string>('');

  useEffect(() => {
    mermaid.initialize({
      startOnLoad: false,
      theme: 'base',
      themeVariables: {
        primaryColor: '#005eb8',
        primaryTextColor: '#fff',
        primaryBorderColor: '#003d78',
        lineColor: '#4c6272',
        secondaryColor: '#f0f4f5',
        tertiaryColor: '#e8edee',
        fontFamily: '"Frutiger W01", Arial, sans-serif',
      },
      flowchart: { curve: 'basis', htmlLabels: true, useMaxWidth: true },
    });

    const renderDiagram = async () => {
      try {
        const id = `mermaid-${Date.now()}`;
        const { svg } = await mermaid.render(id, code);
        setSvg(svg);
        setError('');
      } catch (err) {
        console.warn('Mermaid render error:', err);
        setError(err instanceof Error ? err.message : 'Render error');
        setSvg('');
      }
    };

    renderDiagram();
  }, [code]);

  if (error) {
    return (
      <div className="text-sm text-[#4c6272] whitespace-pre-wrap font-mono p-4 bg-[#f0f4f5]">
        {code}
      </div>
    );
  }

  return (
    <div ref={containerRef} dangerouslySetInnerHTML={{ __html: svg }} className="mermaid-diagram" />
  );
}