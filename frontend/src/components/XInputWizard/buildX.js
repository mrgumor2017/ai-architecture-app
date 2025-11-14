// frontend/src/components/XInputWizard/buildX.js
import { EXPECTED_LEN } from "./x_schema";

/**
 * Збирає X вектор з форми за схемою.
 * - ігнорує поля з noX
 * - підтримує bool/int/float/percent/select
 * - завжди повертає масив довжини expectedLen (дефолт 441)
 */
export function buildXFromSchema(schema, valuesByGroup, expectedLen = EXPECTED_LEN) {
  // валідні індекси лише для полів, що йдуть у X
  const indices = schema
    .flatMap(g => g.fields)
    .filter(f => !f.noX && Number.isInteger(f.xIndex) && f.xIndex >= 0)
    .map(f => f.xIndex);

  const maxIdx = indices.length ? Math.max(...indices) : -1;
  const size = Math.max(expectedLen, maxIdx + 1);

  const X = new Array(size).fill(0);

  for (const g of schema) {
    const vals = valuesByGroup[g.id] || {};
    for (const f of g.fields) {
      if (f.noX) continue;
      if (!Number.isInteger(f.xIndex) || f.xIndex < 0 || f.xIndex >= size) continue;

      let raw = vals[f.key];

      switch (f.type) {
        case "bool":
          raw = raw ? 1 : 0;
          break;
        case "percent": {
          let p = Number(String(raw ?? 0).toString().replace(",", "."));
          if (!Number.isFinite(p)) p = 0;
          p = Math.max(0, Math.min(100, p));
          raw = p / 100.0;
          break;
        }
        case "int": {
          let n = parseInt(raw, 10);
          if (!Number.isFinite(n)) n = 0;
          if (f.min != null) n = Math.max(f.min, n);
          if (f.max != null) n = Math.min(f.max, n);
          raw = n;
          break;
        }
        case "float": {
          let n = Number(String(raw ?? 0).toString().replace(",", "."));
          if (!Number.isFinite(n)) n = 0;
          if (f.min != null) n = Math.max(f.min, n);
          if (f.max != null) n = Math.min(f.max, n);
          raw = n;
          break;
        }
        case "select": {
          // очікується, що у vals[f.key] вже лежить value або index
          // якщо value не число — приводимо до числа індекс опції
          if (f.options && Array.isArray(f.options)) {
            const opts = f.options;
            // якщо прилетів текст — знайти індекс
            if (typeof raw === "string") {
              const idx = opts.findIndex(o => (o.value ?? o) === raw);
              raw = idx >= 0 ? idx : 0;
            } else if (typeof raw !== "number") {
              raw = 0;
            }
          } else {
            raw = Number(raw) || 0;
          }
          break;
        }
        default: {
          // для невідомих типів — спроба як число
          let n = Number(String(raw ?? 0).toString().replace(",", "."));
          if (!Number.isFinite(n)) n = 0;
          raw = n;
        }
      }

      X[f.xIndex] = Number(raw);
    }
  }

  // нормалізувати довжину до expectedLen
  if (X.length > expectedLen) return X.slice(0, expectedLen);
  if (X.length < expectedLen) return X.concat(new Array(expectedLen - X.length).fill(0));
  return X;
}
