import ResourcePage from '../components/ResourcePage';
import { useApi } from '../hooks/useApi';
import api from '../api/api';
import { fmtNum } from '../utils/format';

const FORMATS = [['GENERIC', 'Application log (timestamp, level, message)'], ['ACCESS', 'Web access log (Apache/Nginx)']];

function WatchToggle({ source, ctx }) {
  const status = useApi(`/sources/${source.id}/watch`);
  if (!source.filePath) return null;
  const watching = status.data?.watching;
  const toggle = () => ctx.run(async () => {
    await (watching ? api.del(`/sources/${source.id}/watch`) : api.post(`/sources/${source.id}/watch`));
    await status.reload();
  }, watching ? `Stopped watching ${source.name}.` : `Watching ${source.name}. New lines are stored as they’re written.`);
  return (
    <button className={`btn btn-small ${watching ? 'btn-live' : 'btn-quiet'}`} disabled={ctx.busy || !status.data} onClick={toggle} aria-pressed={!!watching}>
      {watching ? 'Watching' : 'Watch'}
    </button>
  );
}

const importResult = (name, r) =>
  `Imported ${fmtNum(r.linesOk)} new lines into ${name}${r.linesTotal > r.linesOk + r.linesFailed ? ` (${fmtNum(r.linesTotal - r.linesOk - r.linesFailed)} were already stored)` : ''}${r.linesFailed ? `; ${fmtNum(r.linesFailed)} lines couldn’t be read in this format` : ''}.`;

export default function Sources() {
  const importFrom = (source, ctx, filePath) => ctx.run(async () => {
    const { data } = await api.post(`/sources/${source.id}/import`, filePath ? { filePath } : {});
    ctx.setNotice(importResult(source.name, data));
  });

  const chooseAndImport = async (source, ctx) => {
    const r = await window.api.openLogFile();
    if (r?.data?.filePath) importFrom(source, ctx, r.data.filePath);
  };

  return (
    <ResourcePage
      title="Log sources"
      about="Each source is one log file. Import it to load what’s already there, or watch it to store new lines as they arrive. Watched lines are checked against alert policies every few seconds."
      path="/sources"
      noun="source"
      defaults={{ name: '', filePath: '', format: 'GENERIC' }}
      fields={[
        { name: 'name', label: 'Name', required: true, placeholder: 'auth-server' },
        { name: 'filePath', label: 'File path', placeholder: '/var/log/auth.log', mono: true, help: 'Absolute path, or relative to the LogSentinel folder.' },
        { name: 'format', label: 'Format', type: 'select', options: FORMATS },
      ]}
      columns={[
        { label: 'Name', render: (s) => s.name },
        { label: 'File', className: 'mono', render: (s) => s.filePath || <span className="muted">No file set</span> },
        { label: 'Format', render: (s) => (s.format === 'ACCESS' ? 'Web access' : 'Application') },
        {
          label: 'Enabled',
          render: (s, ctx) => (
            <label className="switch">
              <input type="checkbox" checked={s.isActive} disabled={ctx.busy} onChange={() => ctx.run(() => api.put(`/sources/${s.id}`, { isActive: !s.isActive }))} />
              <span className="sr-only">Enable {s.name}</span>
            </label>
          ),
        },
      ]}
      rowActions={(s, ctx) => (
        <>
          {s.filePath && <button className="btn btn-small" disabled={ctx.busy} onClick={() => importFrom(s, ctx)}>Import</button>}
          {window.api && <button className="btn btn-small btn-quiet" disabled={ctx.busy} onClick={() => chooseAndImport(s, ctx)}>Import from file…</button>}
          <WatchToggle source={s} ctx={ctx} />
        </>
      )}
      deleteName={(s) => s.name}
    />
  );
}
