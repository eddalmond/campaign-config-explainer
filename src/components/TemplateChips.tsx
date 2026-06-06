import { findTemplateTokens } from '../utils/templates';

interface Props {
  text?: string;
  className?: string;
}

export default function TemplateChips({ text, className }: Props) {
  const tokens = findTemplateTokens(text);
  if (tokens.length === 0) return null;
  return (
    <span className={`template-chips ${className ?? ''}`}>
      {tokens.map(t => (
        <span
          key={t.raw}
          className={`template-chip template-chip--${t.kind}`}
          title={t.kind === 'deploy' ? 'Deploy-time template token' : 'Runtime text-substitution token'}
        >
          {t.label}
        </span>
      ))}
    </span>
  );
}
