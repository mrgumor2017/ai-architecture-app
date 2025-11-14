// frontend/src/components/XInputWizard/GroupForm.jsx
import { Form } from "react-bootstrap";

export default function GroupForm({ group, values, onChange }) {
  const v = values || {};

  const setVal = (key, next) => {
    const f = group.fields.find(x => x.key === key);
    let out = { ...v, [key]: next };
    if (f?.exclusiveWith && (next === 1 || next === true)) {
      f.exclusiveWith.forEach(k => { out[k] = 0; });
    }
    onChange(out);
  };

  const firstSelectValue = (field) => {
    if (Array.isArray(field.options) && field.options.length) {
      const first = field.options[0];
      return (typeof first === "object" && first !== null) ? (first.value ?? 0) : 0;
    }
    return 0;
  };

  return (
    <div className="d-grid gap-3">
      {group.fields.map(field => {
        // дефолт 0 для всіх числових/булевих/percent/select
        let val;
        if (field.type === "select") {
          const fallback = firstSelectValue(field);
          val = v[field.key] ?? fallback;
        } else if (field.type === "text" || field.noX) {
          val = v[field.key] ?? ""; // текстові залишаємо порожнім
        } else {
          val = v[field.key] ?? 0;
        }

        if (field.type === "bool") {
          return (
            <Form.Check
              key={field.key}
              type="switch"
              id={field.key}
              label={field.label}
              checked={!!val}
              onChange={e => setVal(field.key, e.target.checked ? 1 : 0)}
            />
          );
        }

        if (field.type === "int") {
          return (
            <Form.Group key={field.key}>
              <Form.Label>{field.label}</Form.Label>
              <Form.Control
                type="number"
                value={val}
                min={field.min ?? 0}
                max={field.max ?? 1_000_000_000}
                step={1}
                onChange={e => {
                  let x = parseInt(e.target.value, 10);
                  if (!Number.isFinite(x)) x = 0;
                  if (field.min != null) x = Math.max(field.min, x);
                  if (field.max != null) x = Math.min(field.max, x);
                  setVal(field.key, x);
                }}
              />
            </Form.Group>
          );
        }

        if (field.type === "float") {
          return (
            <Form.Group key={field.key}>
              <Form.Label>{field.label}</Form.Label>
              <Form.Control
                type="number"
                value={val}
                step={field.step ?? "0.01"}
                onChange={e => {
                  let x = Number(String(e.target.value).replace(",", "."));
                  if (!Number.isFinite(x)) x = 0;
                  if (field.min != null) x = Math.max(field.min, x);
                  if (field.max != null) x = Math.min(field.max, x);
                  setVal(field.key, x);
                }}
              />
            </Form.Group>
          );
        }

        if (field.type === "percent") {
          return (
            <Form.Group key={field.key}>
              <Form.Label>{field.label} (0..100)</Form.Label>
              <Form.Control
                type="number"
                value={val}
                min={0}
                max={100}
                step="0.01"
                onChange={e => {
                  let p = Number(String(e.target.value).replace(",", "."));
                  if (!Number.isFinite(p)) p = 0;
                  p = Math.max(0, Math.min(100, p));
                  setVal(field.key, p);
                }}
              />
              <Form.Text className="text-muted">У X піде 0..1</Form.Text>
            </Form.Group>
          );
        }

        if (field.type === "select" && Array.isArray(field.options)) {
          return (
            <Form.Group key={field.key}>
              <Form.Label>{field.label}</Form.Label>
              <Form.Select
                value={val}
                onChange={e => setVal(field.key, e.target.value)}
              >
                {field.options.map((opt, i) => {
                  const value = (typeof opt === "object" && opt !== null) ? (opt.value ?? i) : opt;
                  const label = (typeof opt === "object" && opt !== null) ? (opt.label ?? String(value)) : String(opt);
                  return <option key={i} value={value}>{label}</option>;
                })}
              </Form.Select>
            </Form.Group>
          );
        }

        // text або noX
        return (
          <Form.Group key={field.key}>
            <Form.Label>{field.label}</Form.Label>
            <Form.Control
              type="text"
              value={val}
              onChange={e => setVal(field.key, e.target.value)}
            />
          </Form.Group>
        );
      })}
    </div>
  );
}
