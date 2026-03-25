import type { ActionMapping } from '../types/campaign';

interface Props {
  mapper: Record<string, ActionMapping>;
}

export default function ActionsMapperTable({ mapper }: Props) {
  const entries = Object.entries(mapper);

  if (entries.length === 0) {
    return <p className="text-[#4c6272]">No ActionsMapper defined.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-[#005eb8] text-white">
            <th className="p-2 text-left font-semibold uppercase text-xs">Internal Code</th>
            <th className="p-2 text-left font-semibold uppercase text-xs">External Routing Code</th>
            <th className="p-2 text-left font-semibold uppercase text-xs">Action Type</th>
            <th className="p-2 text-left font-semibold uppercase text-xs">Description</th>
            <th className="p-2 text-left font-semibold uppercase text-xs">URL</th>
          </tr>
        </thead>
        <tbody>
          {entries.map(([key, action]) => (
            <tr key={key} className="border-b border-[#d8dde0] hover:bg-[#f0f4f5]">
              <td className="p-2 font-mono">{key}</td>
              <td className="p-2">{action.ExternalRoutingCode || '—'}</td>
              <td className="p-2">{action.ActionType || '—'}</td>
              <td className="p-2">{action.ActionDescription || '—'}</td>
              <td className="p-2">
                {action.UrlLink ? (
                  <a href="#" className="text-[#005eb8] hover:underline">{action.UrlLabel || action.UrlLink}</a>
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