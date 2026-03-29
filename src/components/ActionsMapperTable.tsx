import type { ActionMapping } from '../types/campaign';

interface Props {
  mapper: Record<string, ActionMapping>;
}

export default function ActionsMapperTable({ mapper }: Props) {
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
          </tr>
        </thead>
        <tbody>
          {entries.map(([key, action]) => (
            <tr key={key}>
              <td className="font-mono">{key}</td>
              <td>{action.ExternalRoutingCode || '—'}</td>
              <td>{action.ActionType || '—'}</td>
              <td>{action.ActionDescription || '—'}</td>
              <td>
                {action.UrlLink ? (
                  <a href="#">{action.UrlLabel || action.UrlLink}</a>
                ) : (
                  '—'
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}