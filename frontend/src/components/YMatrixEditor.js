import React, { useMemo } from "react";
import { Form } from "react-bootstrap";

/**
 * Редактор Y як таблиці 21×21 із підписами 0..20
 * props:
 *  - size (number)           : розмір матриці (типово 21)
 *  - value (number[][])      : матриця Y (size×size) зі значень 0..2
 *  - onChange (fn(newY))     : колбек при зміні будь-якої клітинки
 *  - disabled (boolean)      : заблокувати редагування
 */
export default function YMatrixEditor({ size = 21, value, onChange, disabled = false }) {
  const matrix = useMemo(() => {
    if (!Array.isArray(value) || value.length !== size) {
      return Array.from({ length: size }, () => Array(size).fill(0));
    }
    return value.map(row => (row.length === size ? row : [...row, ...Array(size - row.length).fill(0)].slice(0, size)));
  }, [value, size]);

  const handleCell = (r, c, v) => {
    // дозволяємо тільки 0..2 (цілі)
    let num = parseInt(String(v).replace(",", "."), 10);
    if (Number.isNaN(num)) num = 0;
    if (num < 0) num = 0;
    if (num > 2) num = 2;
    const next = matrix.map((row, ri) => (ri === r ? row.map((x, ci) => (ci === c ? num : x)) : row));
    onChange?.(next);
  };

  // Масове вставлення: дозволити вставку 21×21 через буфер обміну (CSV або таби)
  const onPaste = (e) => {
    if (disabled) return;
    const text = e.clipboardData?.getData("text/plain");
    if (!text) return;
    const rows = text.trim().split(/\r?\n/).map(line => line.split(/[\t,;]/));
    if (rows.length === 0) return;

    const sizeGuess = Math.min(size, rows.length);
    const next = matrix.map(row => row.slice());
    for (let r = 0; r < sizeGuess; r++) {
      const cols = rows[r];
      const w = Math.min(size, cols.length);
      for (let c = 0; c < w; c++) {
        let num = parseInt(cols[c], 10);
        if (Number.isNaN(num)) num = 0;
        if (num < 0) num = 0;
        if (num > 2) num = 2;
        next[r][c] = num;
      }
    }
    e.preventDefault();
    onChange?.(next);
  };

  // невеликий грід зі скролом
  return (
    <div
      onPaste={onPaste}
      style={{
        border: "1px solid rgba(0,0,0,.1)",
        borderRadius: 8,
        overflow: "auto",
        maxHeight: 520,
      }}
    >
      <table className="table table-sm mb-0 align-middle" style={{ tableLayout: "fixed" }}>
        <thead className="table-light" style={{ position: "sticky", top: 0, zIndex: 1 }}>
          <tr>
            <th style={{ width: 42 }} />
            {Array.from({ length: size }, (_, j) => (
              <th key={j} className="text-center" style={{ width: 36, minWidth: 36 }}>{j}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: size }, (_, i) => (
            <tr key={i}>
              <th className="table-light text-center" style={{ position: "sticky", left: 0, zIndex: 1, width: 42 }}>
                {i}
              </th>
              {Array.from({ length: size }, (_, j) => (
                <td key={j} className="p-0 text-center" style={{ width: 36, minWidth: 36 }}>
                  <Form.Control
                    type="number"
                    min={0}
                    max={2}
                    step={1}
                    value={matrix[i][j]}
                    onChange={(e) => handleCell(i, j, e.target.value)}
                    disabled={disabled}
                    style={{
                      width: "100%",
                      border: "none",
                      textAlign: "center",
                      padding: "6px 2px",
                      background: disabled ? "#f8f9fa" : "white",
                    }}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
