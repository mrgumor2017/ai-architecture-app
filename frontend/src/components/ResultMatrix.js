import React from "react";
import { Button } from "react-bootstrap";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

export default function ResultMatrix({ matrix }) {
  if (!matrix) return <div className="text-muted">Результат з’явиться тут після передбачення.</div>;

  const downloadCSV = () => {
    const rows = matrix.map(r => r.join(",")).join("\n");
    const blob = new Blob([rows], { type: "text/csv;charset=utf-8" });
    saveAs(blob, `architecture_${Date.now()}.csv`);
  };

  const downloadXLSX = () => {
    const ws = XLSX.utils.aoa_to_sheet(matrix);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Architecture");
    const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    saveAs(new Blob([wbout], { type: "application/octet-stream" }), `architecture_${Date.now()}.xlsx`);
  };

  return (
    <>
      <div className="d-flex justify-content-between align-items-center mb-2">
        <h5 className="mb-0">Згенерована архітектура (21×21)</h5>
        <div className="d-flex gap-2">
          <Button variant="outline-secondary" size="sm" onClick={downloadCSV}>Завантажити CSV</Button>
          <Button variant="outline-primary" size="sm" onClick={downloadXLSX}>Завантажити Excel</Button>
        </div>
      </div>
      <div style={{ maxHeight: 520, overflow: "auto", border: "1px solid rgba(0,0,0,.1)", borderRadius: 8 }}>
        <table className="table table-sm table-hover mb-0">
          <tbody>
            {matrix.map((row, i) => (
              <tr key={i}>
                {row.map((cell, j) => (
                  <td key={j} className="text-center" style={{ width: 28, minWidth: 28 }}>
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
