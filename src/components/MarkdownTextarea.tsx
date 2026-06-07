import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { findTemplateTokens } from '../utils/templates';

interface Props {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  rows?: number;
  placeholder?: string;
  /** Whether to treat the content as Markdown (default true). When false,
   *  this is just a textarea with no preview tab. */
  markdown?: boolean;
  /** Optional className for the wrapper. */
  className?: string;
}

/**
 * A textarea + Markdown preview combination. Used for any free-text field
 * where the user might write Markdown (rule Description, ActionDescription,
 * StatusText messages).
 *
 * The preview tab also surfaces the campaign's template tokens
 * (<<...>> deploy-time, [[...]] substitution) as styled chips, so the
 * user can see at a glance that those tokens are intentional and not
 * raw text. The actual resolved values can't be shown here (that needs
 * a person record + the runtime — see PR-10 simulator).
 */
export default function MarkdownTextarea({
  id, value, onChange, rows = 4, placeholder, markdown = true, className,
}: Props) {
  const [mode, setMode] = useState<'edit' | 'preview'>('edit');
  const hasContent = !!value && value.trim().length > 0;
  const tokens = hasContent ? findTemplateTokens(value) : [];

  return (
    <div className={`md-textarea ${className ?? ''}`}>
      {markdown && (
        <div className="md-textarea__tabs" role="tablist" aria-label="Markdown view">
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'edit'}
            className={`tab-btn ${mode === 'edit' ? 'active' : ''}`}
            onClick={() => setMode('edit')}
          >
            Edit
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'preview'}
            className={`tab-btn ${mode === 'preview' ? 'active' : ''}`}
            onClick={() => setMode('preview')}
            disabled={!hasContent}
            title={hasContent ? 'Preview the rendered Markdown' : 'Nothing to preview'}
          >
            Preview
            {tokens.length > 0 && (
              <span className="md-textarea__token-badge" title={`${tokens.length} template token${tokens.length === 1 ? '' : 's'} in this text`}>
                {tokens.length}
              </span>
            )}
          </button>
        </div>
      )}

      {(!markdown || mode === 'edit') ? (
        <textarea
          id={id}
          className="text-area"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={rows}
          placeholder={placeholder}
        />
      ) : (
        <div className="md-textarea__preview" style={{ minHeight: `${rows * 1.5 + 1}em` }}>
          {hasContent ? (
            <ReactMarkdown
              components={{
                // Replace plain text nodes that contain template tokens
                // with a chip-aware span. react-markdown's children prop
                // gives us the raw text for the leaf we override.
                p: ({ children }) => <p>{renderTextWithTokens(children)}</p>,
                li: ({ children }) => <li>{renderTextWithTokens(children)}</li>,
                h1: ({ children }) => <h1>{renderTextWithTokens(children)}</h1>,
                h2: ({ children }) => <h2>{renderTextWithTokens(children)}</h2>,
                h3: ({ children }) => <h3>{renderTextWithTokens(children)}</h3>,
                h4: ({ children }) => <h4>{renderTextWithTokens(children)}</h4>,
                blockquote: ({ children }) => <blockquote>{renderTextWithTokens(children)}</blockquote>,
                em: ({ children }) => <em>{renderTextWithTokens(children)}</em>,
                strong: ({ children }) => <strong>{renderTextWithTokens(children)}</strong>,
                code: ({ children, className }) => {
                  // Inline code is `code`, code blocks (with a language) come
                  // through here too — we treat them both the same way.
                  const text = String(children);
                  if (/^<<.*>>$/.test(text) || /^\[\[.+\]\]$/.test(text)) {
                    return <TokenChip raw={text} />;
                  }
                  return <code className={className}>{children}</code>;
                },
              }}
            >
              {value}
            </ReactMarkdown>
          ) : (
            <div className="md-textarea__empty">Nothing to preview yet.</div>
          )}
        </div>
      )}
    </div>
  );
}

function renderTextWithTokens(children: React.ReactNode): React.ReactNode {
  // If children is a string, look for tokens and split accordingly.
  if (typeof children === 'string') {
    return splitStringOnTokens(children);
  }
  // If children is an array, recurse into each item.
  if (Array.isArray(children)) {
    return children.map((child, i) => {
      if (typeof child === 'string') return <span key={i}>{splitStringOnTokens(child)}</span>;
      return child;
    });
  }
  return children;
}

function splitStringOnTokens(text: string): React.ReactNode {
  // Regex covers both deploy tokens (<<...>>) and substitution tokens
  // ([[...]]) — the patterns don't overlap.
  const re = /(<<[^>]+>>|\[\[[^\]]+\]\])/g;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(text)) !== null) {
    if (m.index > lastIndex) parts.push(text.slice(lastIndex, m.index));
    parts.push(<TokenChip key={`t${i++}`} raw={m[0]} />);
    lastIndex = re.lastIndex;
  }
  if (lastIndex < text.length) parts.push(text.slice(lastIndex));
  return parts.length === 1 ? parts[0] : <>{parts}</>;
}

function TokenChip({ raw }: { raw: string }) {
  const isDeploy = /^<<.*>>$/.test(raw);
  const isSubstitution = /^\[\[.+\]\]$/.test(raw);
  const kind = isDeploy ? 'deploy' : isSubstitution ? 'substitution' : 'unknown';
  return (
    <code
      className={`md-textarea__token md-textarea__token--${kind}`}
      title={isDeploy
        ? 'Deploy-time template token (resolved at deploy)'
        : isSubstitution
          ? 'Person / Target variable substituted at runtime'
          : 'Template token'}
    >
      {raw}
    </code>
  );
}
