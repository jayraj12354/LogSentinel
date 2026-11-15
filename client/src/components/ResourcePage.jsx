import { useState } from 'react';
import { useApi } from '../hooks/useApi';
import api from '../api/api';

// List + "add" form + per-row actions for the admin setup pages.
// fields: [{ name, label, type?: 'text'|'number'|'password'|'email'|'select', options?: [[value, label]], required?, placeholder?, help?, list? }]
export default function ResourcePage({ title, about, path, noun, columns, fields, defaults, rowActions, deleteName, children }) {
  const list = useApi(path);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState(defaults);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  const run = async (fn, done) => {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await fn();
      if (done) setNotice(done);
      await list.reload();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const submit = (e) => {
    e.preventDefault();
    const payload = Object.fromEntries(fields.map((f) => [f.name, f.type === 'number' ? Number(form[f.name]) : form[f.name]]));
    run(async () => { await api.post(path, payload); setForm(defaults); setAdding(false); }, `Added ${noun} “${form[fields[0].name]}”.`);
  };

  const remove = (row) => {
    const name = deleteName(row);
    if (!window.confirm(`Delete ${noun} “${name}”? This can’t be undone.`)) return;
    run(() => api.del(`${path}/${row.id}`), `Deleted ${noun} “${name}”.`);
  };

  const ctx = { run, busy, setNotice, setError, reload: list.reload };

  return (
    <div className="page page-wide">
      <header className="page-head">
        <div>
          <h1>{title}</h1>
          <p className="muted">{about}</p>
        </div>
        {!adding && <button className="btn btn-primary" onClick={() => setAdding(true)}>Add {noun}</button>}
      </header>

      {adding && (
        <form className="add-form" onSubmit={submit}>
          <h2>New {noun}</h2>
          <div className="field-grid">
            {fields.map((f) => (
              <div key={f.name} className="field">
                <label htmlFor={`f-${f.name}`}>{f.label}</label>
                {f.type === 'select' ? (
                  <select id={`f-${f.name}`} value={form[f.name]} onChange={(e) => setForm({ ...form, [f.name]: e.target.value })}>
                    {f.options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                ) : (
                  <input id={`f-${f.name}`} type={f.type || 'text'} value={form[f.name]} required={f.required} placeholder={f.placeholder} list={f.list} min={f.type === 'number' ? 1 : undefined}
                    className={f.mono ? 'mono' : undefined} onChange={(e) => setForm({ ...form, [f.name]: e.target.value })} />
                )}
                {f.help && <p className="help">{f.help}</p>}
              </div>
            ))}
          </div>
          <div className="actions">
            <button className="btn btn-primary" type="submit" disabled={busy}>Add {noun}</button>
            <button className="btn btn-quiet" type="button" onClick={() => { setAdding(false); setForm(defaults); }}>Cancel</button>
          </div>
        </form>
      )}

      {error && <p className="notice notice-error" role="alert">{error}</p>}
      {notice && <p className="notice" role="status">{notice}</p>}
      {list.error && <p className="notice notice-error">{list.error}</p>}
      {children?.(ctx, list.data)}

      {list.data && list.data.length === 0 && <p className="empty">No {noun}s yet. Use “Add {noun}” to create the first one.</p>}
      {list.data && list.data.length > 0 && (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>{columns.map((c) => <th key={c.label}>{c.label}</th>)}<th><span className="sr-only">Actions</span></th></tr>
            </thead>
            <tbody>
              {list.data.map((row) => (
                <tr key={row.id}>
                  {columns.map((c) => <td key={c.label} className={c.className}>{c.render(row, ctx)}</td>)}
                  <td className="row-actions">
                    {rowActions?.(row, ctx)}
                    {deleteName(row) !== null && <button className="btn btn-quiet btn-small btn-danger" disabled={busy} onClick={() => remove(row)}>Delete</button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
