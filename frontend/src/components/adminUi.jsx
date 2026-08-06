/* ============================================================
   TIỆN ÍCH UI DÙNG CHUNG — dùng bởi các màn hình quản trị
   (CategoryConfig/FN-01, Admin/FN-11+FN-06, Monitoring/FN-12)
   ============================================================ */

export function today() {
  return new Date().toISOString().slice(0, 10);
}

export function fmtDate(v) {
  if (!v) return "—";
  try {
    return new Date(v).toLocaleDateString("vi-VN");
  } catch {
    return v;
  }
}

export function StatusPill({ active, onLabel = "Hoạt động", offLabel = "Khóa" }) {
  return (
    <span className={`text-xs px-2 py-0.5 rounded text-white ${active ? "bg-[#00A82D]" : "bg-slate-400"}`}>
      {active ? onLabel : offLabel}
    </span>
  );
}

export function SimpleTable({ cols, rows }) {
  return (
    <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
          <tr>{cols.map((c, i) => <th key={i} className={`px-4 py-2.5 ${i === cols.length - 1 ? "text-right" : "text-left"}`}>{c}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-t border-slate-100">
              {r.map((cell, j) => <td key={j} className={`px-4 py-2.5 ${j === r.length - 1 ? "text-right" : ""}`}>{cell}</td>)}
            </tr>
          ))}
          {!rows.length && <tr><td colSpan={cols.length} className="text-center py-8 text-slate-500">Chưa có dữ liệu</td></tr>}
        </tbody>
      </table>
    </div>
  );
}

export function FormModal({ title, children, onClose, onSave }) {
  return (
    <div className="fixed inset-0 bg-black/40 z-[100] flex items-center justify-center p-6" onClick={onClose}>
      <div className="bg-white rounded-lg w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
        <h3 className="font-display font-bold text-xl mb-4">{title}</h3>
        <div className="space-y-3">{children}</div>
        <div className="flex justify-end gap-2 mt-5">
          <button onClick={onClose} className="px-4 py-2 rounded-md text-sm bg-slate-100">Hủy</button>
          <button onClick={onSave} className="px-4 py-2 rounded-md text-sm bg-[#00A82D] text-white font-medium">Lưu</button>
        </div>
      </div>
    </div>
  );
}

export function Input({ label, value, onChange, type = "text", step }) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-slate-700 uppercase tracking-wide">{label}</span>
      <input type={type} step={step} value={value ?? ""} onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#00C4B4]" />
    </label>
  );
}

export function Select({ label, value, onChange, options }) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-slate-700 uppercase tracking-wide">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#00C4B4]">
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </label>
  );
}

export function Toggle({ label, checked, onChange }) {
  return (
    <label className="flex items-center gap-2 text-sm">
      <input type="checkbox" checked={!!checked} onChange={(e) => onChange(e.target.checked)} />
      {label}
    </label>
  );
}

export function Row({ k, v }) {
  return (
    <div className="flex gap-3">
      <dt className="w-36 shrink-0 text-slate-500">{k}</dt>
      <dd className="font-medium break-all">{v}</dd>
    </div>
  );
}