export default function GroupTabs({ groups, active, onChange }) {
  return (
    <div className="btn-group mb-3 flex-wrap">
      {groups.map((g, i) => (
        <button
          key={g.id}
          className={`btn ${active===g.id?'btn-primary':'btn-outline-primary'} mb-2`}
          onClick={() => onChange(g.id)}
          type="button"
        >
          {i+1}. {g.title}
        </button>
      ))}
    </div>
  );
}
