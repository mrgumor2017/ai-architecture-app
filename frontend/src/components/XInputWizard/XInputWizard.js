// frontend/src/components/XInputWizard/XInputWizard.jsx
import React, { useMemo, useState } from "react";
import GroupTabs from "./GroupTabs";
import GroupForm from "./GroupForm";
import { X_SCHEMA, EXPECTED_LEN, buildDefaultValuesFromSchema } from "./x_schema";
import { buildXFromSchema } from "./buildX";
import { Button } from "react-bootstrap";

export default function XInputWizard({ onBuilt }) {
  const groups = X_SCHEMA;

  // базове нульове значення для всіх полів
  const zeroDefaults = useMemo(() => buildDefaultValuesFromSchema(groups), [groups]);

  const [active, setActive] = useState(groups[0].id);
  const [valuesByGroup, setValuesByGroup] = useState(zeroDefaults);

  const current = groups.find(g => g.id === active);

  const onGroupChange = (gid, vals) =>
    setValuesByGroup(prev => ({ ...prev, [gid]: { ...(prev[gid] || {}), ...vals } }));

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(valuesByGroup, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "x_wizard_values.json";
    a.click();
  };

  const importJson = async (file) => {
    const text = await file.text();
    const obj = JSON.parse(text) || {};
    // глибокий мердж: базові 0 → поверх користувацькі
    const merged = { ...zeroDefaults };
    for (const g of groups) {
      merged[g.id] = { ...(zeroDefaults[g.id] || {}), ...(obj[g.id] || {}) };
    }
    setValuesByGroup(merged);
  };

  const buildX = () => {
    const X = buildXFromSchema(groups, valuesByGroup, EXPECTED_LEN);
    onBuilt?.(X);
  };

  return (
    <div>
      <GroupTabs groups={groups} active={active} onChange={setActive} />
      {current && (
        <GroupForm
          group={current}
          values={valuesByGroup[current.id] || {}}
          onChange={(vals) => onGroupChange(current.id, vals)}
        />
      )}
      <div className="d-flex gap-2 mt-3">
        <Button variant="secondary" onClick={exportJson}>Експорт пресету</Button>
        <label className="btn btn-outline-secondary mb-0">
          Імпорт пресету
          <input type="file" accept="application/json" hidden onChange={(e) => e.target.files[0] && importJson(e.target.files[0])} />
        </label>
        <Button variant="primary" onClick={buildX}>Побудувати X</Button>
      </div>
    </div>
  );
}
