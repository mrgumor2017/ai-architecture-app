import React, { useState } from "react";
import { Button, Form, Spinner, Alert } from "react-bootstrap";
import YMatrixEditor from "./YMatrixEditor";
import XInputWizard from "./XInputWizard/XInputWizard";

export default function DataForm({ onPredictRequest, onTrainJSON }) {
  const [inputs, setInputs] = useState("");     // X_data textarea
  const [epochs, setEpochs] = useState(300);
  const [lr, setLr] = useState("0.001");
  const [withY, setWithY] = useState(false);    // “Додати Y вручну”
  const [yText, setYText] = useState("");       // старий текстовий Y (коли вимкнено режим таблиці)
  const [warnMsg, setWarnMsg] = useState("");
  const [predicting, setPredicting] = useState(false);
  const [training, setTraining] = useState(false);

  // Показувати/ховати textarea для X
  const [showXTextarea, setShowXTextarea] = useState(false);

  // Табличний Y за замовчуванням
  const [yAsTable, setYAsTable] = useState(true);
  const SIZE = 21;
  const mkEmpty = () => Array.from({ length: SIZE }, () => Array(SIZE).fill(0));
  const [yMatrix, setYMatrix] = useState(mkEmpty());

  // Трохи ширший парсер: кома/пробіл/таб/крапка з комою/переноси рядків
  const parseNumbers = (txt) =>
    txt
      .split(/[,\s;\t\r\n]+/)
      .map(s => s.trim())
      .filter(Boolean)
      .map(v => parseFloat(v.replace(",", ".")))
      .filter(v => Number.isFinite(v));

  const flattenY = (mat) => mat.flat(); // 21×21 → 441

  const validateYTokens = (arr) => {
    if (arr.length !== SIZE * SIZE) return `Y_data має рівно ${SIZE * SIZE} значень, зараз ${arr.length}.`;
    for (let i = 0; i < arr.length; i++) {
      const v = Math.round(arr[i]);
      if (!(v === 0 || v === 1 || v === 2)) return `Y_data містить значення поза 0..2 (позиція ${i}).`;
    }
    return null;
  };

  const handlePredict = async () => {
    setWarnMsg("");
    const X = parseNumbers(inputs);
    if (!X.length) { setWarnMsg("Введіть X_data."); return; }

    setPredicting(true);
    try {
      await onPredictRequest(X);
    } finally {
      setPredicting(false);
    }
  };

  const handleTrain = async () => {
    setWarnMsg("");

    const X = parseNumbers(inputs);
    if (!X.length) { setWarnMsg("Введіть X_data для навчання."); return; }

    const payload = {
      X_data: X,
      epochs: Number(epochs) || 300,
      lr: Number(String(lr).replace(",", ".")) || 0.001
    };

    if (withY) {
      const Yarr = yAsTable
        ? flattenY(yMatrix).map(v => Math.max(0, Math.min(2, Math.round(v))))
        : parseNumbers(yText).map(v => Math.round(v));

      const err = validateYTokens(Yarr);
      if (err) { setWarnMsg(err); return; }
      payload.Y_data = Yarr;
    }

    setTraining(true);
    try {
      await onTrainJSON(payload);
    } finally {
      setTraining(false);
    }
  };

  return (
    <Form>
      {/* Побудова X за групами */}
      <div className="mb-3">
        <div className="d-flex justify-content-between align-items-center mb-2">
          <h6 className="mb-0">Побудова X за групами</h6>
          <small className="text-muted">зручні поля → авто-заповнення X_data</small>
        </div>

        <XInputWizard
          onBuilt={(X) => setInputs(X.join(","))}
        />
      </div>

      {/* Перемикач показу textarea для X */}
      <Form.Check
        className="mb-2"
        type="switch"
        id="showXTextarea"
        label="Вводити X як список (через кому)"
        checked={showXTextarea}
        onChange={(e) => setShowXTextarea(e.target.checked)}
      />

      {/* X через кому — лише якщо вмикнули перемикач */}
      {showXTextarea && (
        <Form.Group className="mb-2">
          <Form.Label>Введіть X_data (через кому)</Form.Label>
          <Form.Control
            as="textarea"
            rows={4}
            value={inputs}
            onChange={(e) => setInputs(e.target.value)}
            placeholder="0.1,0.2,..."
          />
        </Form.Group>
      )}

      <div className="d-flex gap-2 align-items-center mb-2">
        <Button type="button" variant="primary" onClick={handlePredict} disabled={predicting}>
          {predicting ? <Spinner size="sm" animation="border" /> : "ЗГЕНЕРУВАТИ АРХІТЕКТУРУ"}
        </Button>
      </div>

      <hr className="my-3" />

      <Form.Check
        className="mb-2"
        type="switch"
        id="withY"
        label="Додати Y_data вручну (краща якість)"
        checked={withY}
        onChange={(e) => setWithY(e.target.checked)}
      />

      {withY && (
        <>
          <div className="d-flex justify-content-between align-items-center">
            <Form.Label className="mb-1">Y_data (0..2) — редагування таблицею 21×21</Form.Label>
            <Form.Check
              type="switch"
              id="yAsTable"
              label="Редагувати Y як таблицю (21×21)"
              checked={yAsTable}
              onChange={(e) => setYAsTable(e.target.checked)}
            />
          </div>

          {yAsTable ? (
            <>
              <YMatrixEditor size={SIZE} value={yMatrix} onChange={setYMatrix} />

              {/* Кнопки імпорту/експорту Y */}
              <div className="d-flex gap-2 flex-wrap mt-2">
                {/* Експорт CSV (21x21) */}
                <Button
                  type="button"
                  variant="outline-secondary"
                  onClick={() => {
                    const rows = yMatrix.map(row => row.join(","));
                    const csv = rows.join("\n");
                    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
                    const a = document.createElement("a");
                    a.href = URL.createObjectURL(blob);
                    a.download = "Y_matrix_21x21.csv";
                    a.click();
                  }}
                >
                  Експорт Y → CSV
                </Button>

                {/* Експорт JSON (21x21) */}
                <Button
                  type="button"
                  variant="outline-secondary"
                  onClick={() => {
                    const blob = new Blob([JSON.stringify(yMatrix, null, 2)], { type: "application/json" });
                    const a = document.createElement("a");
                    a.href = URL.createObjectURL(blob);
                    a.download = "Y_matrix_21x21.json";
                    a.click();
                  }}
                >
                  Експорт Y → JSON
                </Button>

                {/* Імпорт CSV/JSON (автовизначення) */}
                <label className="btn btn-outline-secondary mb-0">
                  Імпорт Y (CSV/JSON)
                  <input
                    type="file"
                    accept=".csv, text/csv, application/json, .json"
                    hidden
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const text = await file.text();

                      const isJSON = file.name.toLowerCase().endsWith(".json") || text.trim().startsWith("[");
                      try {
                        let mat;
                        if (isJSON) {
                          const parsed = JSON.parse(text);
                          // дозволяємо як 21x21, так і "плоский" [441]
                          if (Array.isArray(parsed) && Array.isArray(parsed[0])) {
                            mat = parsed;
                          } else if (Array.isArray(parsed) && parsed.length === SIZE * SIZE) {
                            mat = Array.from({ length: SIZE }, (_, i) => parsed.slice(i * SIZE, (i + 1) * SIZE));
                          }
                        } else {
                          // CSV: сплітимо рядки й комірки
                          const rows = text.trim().split(/\r?\n/).map(line => line.split(/[,;\t]/).map(s => s.trim()));
                          const next = Array.from({ length: SIZE }, () => Array(SIZE).fill(0));
                          for (let r = 0; r < Math.min(SIZE, rows.length); r++) {
                            for (let c = 0; c < Math.min(SIZE, rows[r].length); c++) {
                              let v = parseInt(rows[r][c], 10);
                              if (Number.isNaN(v)) v = 0;
                              if (v < 0) v = 0;
                              if (v > 2) v = 2;
                              next[r][c] = v;
                            }
                          }
                          mat = next;
                        }
                        if (!mat || mat.length !== SIZE || mat.some(row => row.length !== SIZE)) {
                          setWarnMsg("Не вдалось імпортувати Y: потрібна матриця 21×21 або масив із 441 значення.");
                        } else {
                          setYMatrix(mat);
                          setWarnMsg("");
                        }
                      } catch {
                        setWarnMsg("Помилка читання файлу Y. Спробуй інший формат (CSV або JSON).");
                      } finally {
                        e.target.value = "";
                      }
                    }}
                  />
                </label>
              </div>
            </>
          ) : (
            <Form.Control
              as="textarea"
              rows={5}
              value={yText}
              onChange={(e) => setYText(e.target.value)}
              placeholder={`Введіть ${SIZE * SIZE} цілих чисел 0..2 через кому`}
            />
          )}
        </>
      )}

      <div className="d-flex gap-2 align-items-center mt-2">
        <Form.Group>
          <Form.Label>Epochs</Form.Label>
          <Form.Control type="number" min={1} max={5000} value={epochs} onChange={(e) => setEpochs(e.target.value)} />
        </Form.Group>
        <Form.Group>
          <Form.Label>LR</Form.Label>
          <Form.Control type="text" value={lr} onChange={(e) => setLr(e.target.value)} />
        </Form.Group>
        <Button type="button" variant="success" onClick={handleTrain} disabled={training}>
          {training ? <Spinner size="sm" animation="border" /> : "ДОНАВЧИТИ (JSON)"}
        </Button>
      </div>

      {warnMsg && <Alert variant="warning" className="mt-3">{warnMsg}</Alert>}
    </Form>
  );
}
