from typing import Optional, Tuple, List
import os
import io

import torch
import pandas as pd

def _read_excel_smart(buf: io.BytesIO, prefer_sheet: Optional[str] = None) -> tuple[pd.DataFrame, list[str]]:
    """Повертає (df, sheet_names) — df першого вдало прочитаного аркуша.
       Порядок спроб: prefer_sheet (якщо існує) → 'X' → перший аркуш.
    """
    buf.seek(0)
    xf = pd.ExcelFile(buf)
    sheets = xf.sheet_names
    tried = set()

    for name in [prefer_sheet, "X", (sheets[0] if sheets else None)]:
        if name and name in sheets and name not in tried:
            tried.add(name)
            buf.seek(0)
            return pd.read_excel(buf, sheet_name=name), sheets
    # якщо аркушів нема
    raise ValueError("Excel doesn't contain readable sheets")


# ───────── Збереження / завантаження ─────────
def save_model(model: torch.nn.Module, path: str):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    torch.save({"state_dict": model.state_dict()}, path)


def load_model(path: str) -> Optional[torch.nn.Module]:
    if not os.path.exists(path):
        return None
    from .transformer_model import SimpleTransformer
    try:
        ckpt = torch.load(path, map_location="cpu")
        # Model shape (input/target) при завантаженні за замовчуванням 441/441
        model = SimpleTransformer(input_seq_len=441, target_seq_len=441)
        model.load_state_dict(ckpt["state_dict"])
        return model
    except Exception:
        return None


# ───────── Парсинг даних ─────────
def _read_table(buf: io.BytesIO, filename: str, sheet_name: Optional[str] = None) -> pd.DataFrame:
    name = filename.lower()
    if name.endswith(".csv"):
        buf.seek(0)
        return pd.read_csv(buf)
    if name.endswith(".xlsx"):
        buf.seek(0)
        return pd.read_excel(buf, sheet_name=sheet_name or 0)
    # спробувати як CSV за замовчуванням
    buf.seek(0)
    return pd.read_csv(buf)


def parse_X_from_tabular(
    buf: io.BytesIO,
    filename: str,
    sheet_name: Optional[str] = None
) -> Optional[List[float]]:
    """
    Гнучкий парсинг X:
      Підтримує:
        - один рядок/один запис у кількох стовпцях → беремо всі стовпці як X
        - стовпець 'X' з комами у клітинці → парсимо як список
    """
    try:
        df = _read_table(buf, filename, sheet_name)
    except Exception:
        return None

    if df.empty:
        return None

    # Випадок: є колонка "X" зі строкою "0.1,0.5,1,..."
    for cand in ["X", "x", "X_data", "x_data"]:
        if cand in df.columns:
            try:
                first = str(df[cand].iloc[0])
                xs = [float(x.strip()) for x in first.replace(";", ",").split(",") if str(x).strip() != ""]
                return xs
            except Exception:
                pass

    # Інакше: беремо перший рядок, усі числові стовпці по порядку
    try:
        numeric = df.select_dtypes(include=["number"])
        if numeric.shape[0] >= 1 and numeric.shape[1] >= 1:
            row0 = numeric.iloc[0].tolist()
            return [float(v) for v in row0]
    except Exception:
        return None

    return None


def parse_XY_from_tabular(
    buf: io.BytesIO,
    filename: str,
    sheet_name: Optional[str] = None
) -> Tuple[Optional[List[float]], Optional[List[int]]]:
    """
    Спроба прочитати одразу X і Y.
    Підтримка форматів:
      1) CSV/Excel, де X у колонках (перший рядок), а Y — 21x21 (441 клітинок) на окремому аркуші 'Y' або в тих же даних з префіксом колонок 'Y_0..Y_440'
      2) CSV/Excel зі стовпцями 'X' (рядок з комами) і 'Y' (рядок з комами)
    Повертає (X_list, Y_tokens) або (X_list, None).
    """
    # 1) Excel: розумний вибір аркуша X + (опційно) аркуш 'Y'
    try:
        if filename.lower().endswith(".xlsx"):
            x_df, sheets = _read_excel_smart(buf, prefer_sheet=sheet_name)
            y_df = None
            if "Y" in sheets:
                y_df = pd.read_excel(io.BytesIO(buf.getvalue()), sheet_name="Y")
            x = _extract_X(x_df)
            y = _extract_Y(y_df) if y_df is not None else None
            if x is not None:
                return x, y
    except Exception:
        pass

    # 2) один файл, де є колонки 'X' та 'Y' — рядки з комами
    try:
        df = _read_table(buf, filename, sheet_name)
        x = None
        y = None
        if any(c in df.columns for c in ["X", "x", "X_data", "x_data"]):
            x = parse_X_from_tabular(io.BytesIO(buf.getvalue()), filename, sheet_name)
        for cand in ["Y", "y", "Y_data", "y_data"]:
            if cand in df.columns:
                first = str(df[cand].iloc[0])
                y_list = [int(float(v.strip())) for v in first.replace(";", ",").split(",") if str(v).strip() != ""]
                y = _normalize_Y_len(y_list)
                break

        # 3) колонки Y_0..Y_440
        if y is None:
            y_cols = [c for c in df.columns if str(c).lower().startswith("y_")]
            if y_cols:
                y_df = df[y_cols].select_dtypes(include=["number"])
                if not y_df.empty:
                    y_raw = y_df.iloc[0].tolist()
                    y = _normalize_Y_len([int(float(v)) for v in y_raw])

        return x, y
    except Exception:
        return None, None


def _normalize_Y_len(y_list: List[int]) -> List[int]:
    """Привести довжину до 441 токенів (обрізати/допадити нулями)."""
    if len(y_list) < 441:
        y_list = y_list + [0] * (441 - len(y_list))
    elif len(y_list) > 441:
        y_list = y_list[:441]
    return y_list


def _extract_X(df: pd.DataFrame) -> Optional[List[float]]:
    if df is None or df.empty:
        return None
    # як у parse_X_from_tabular: або колонка X, або перший рядок числових колонок
    if any(c in df.columns for c in ["X", "x", "X_data", "x_data"]):
        try:
            first = str(df[[c for c in df.columns if c in ["X", "x", "X_data", "x_data"]][0]].iloc[0])
            xs = [float(x.strip()) for x in first.replace(";", ",").split(",") if str(x).strip() != ""]
            return xs
        except Exception:
            pass
    try:
        numeric = df.select_dtypes(include=["number"])
        if numeric.shape[0] >= 1 and numeric.shape[1] >= 1:
            row0 = numeric.iloc[0].tolist()
            return [float(v) for v in row0]
    except Exception:
        return None
    return None


def _extract_Y(df: pd.DataFrame) -> Optional[List[int]]:
    if df is None or df.empty:
        return None
    # очікуємо 21x21 або принаймні 441 числове значення
    numeric = df.select_dtypes(include=["number"])
    if numeric.size == 0:
        return None
    vals = numeric.values.flatten().tolist()
    vals = [int(float(v)) for v in vals]
    return _normalize_Y_len(vals)
