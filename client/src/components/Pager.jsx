export default function Pager({ meta, onPage }) {
  if (!meta || meta.totalPages <= 1) return null;
  return (
    <nav className="pager" aria-label="Pages">
      <button className="btn btn-quiet" disabled={meta.page <= 1} onClick={() => onPage(meta.page - 1)}>Previous</button>
      <span className="muted">Page {meta.page} of {meta.totalPages.toLocaleString()}</span>
      <button className="btn btn-quiet" disabled={meta.page >= meta.totalPages} onClick={() => onPage(meta.page + 1)}>Next</button>
    </nav>
  );
}
