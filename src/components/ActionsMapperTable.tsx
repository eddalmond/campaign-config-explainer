import type { ActionMapping } from '../types/campaign';

interface Props {
  mapper: Record<string, ActionMapping>;
  onEditAction?: (key: string) => void;
}

export default function ActionsMapperTable({ mapper, onEditAction }: Props) {
  const entries = Object.entries(mapper);

  if (entries.length === 0) {
    return <p className="page-description">No ActionsMapper defined.</p>;
  }

  return (
    <div className="table-container">
      <table className="data-table">
        <thead>
          <tr>
            <th>Internal Code</th>
            <th>External Routing Code</th>
            <th>Action Type</th>
            <th>Description</th>
            <th>URL</th>
            {onEditAction && <th></th>}
          </tr>
        </thead>
        <tbody>
          {entries.map(([key, action]) => (
            <tr
              key={key}
              style={{cursor: onEditAction ? 'pointer' : 'default'}}
              onClick={onEditAction ? () => onEditAction(key) : undefined}
            >
              <td className="font-mono">{key}</td>
              <td>{action.ExternalRoutingCode || '—'}</td>
              <td>{action.ActionType || '—'}</td>
              <td>{action.ActionDescription || '—'}</td>
              <td>
                {action.UrlLink ? (
                  <a href="#" onClick={e => e.stopPropagation()}>{action.UrlLabel || action.UrlLink}</a>
                ) : (
                  '—'
                )}
              </td>
              {onEditAction && (
                <td>
                  <button
                    type="button"
                    className="btn btn--small"
                    onClick={(e) => { e.stopPropagation(); onEditAction(key); }}
                  >
                    Edit
                  </button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}