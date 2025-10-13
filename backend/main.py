import io
from typing import List, Optional

import torch
from fastapi import FastAPI, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from pathlib import Path
from datetime import datetime

from model.transformer_model import (
    SimpleTransformer,
    train_once,
    predict_tokens_greedy,
    START_TOKEN,
    VOCAB_SIZE,
)
from model.utils import (
    load_model,
    save_model,
    parse_X_from_tabular,
    parse_XY_from_tabular,
)

# ───────────────────────── FastAPI & CORS ─────────────────────────
app = FastAPI(title="AI Architecture Service (FastAPI + PyTorch)")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ──────────────────────── Шляхи (pathlib) ────────────────────────
# .../ai-architecture-app/backend
BASE_DIR: Path = Path(__file__).resolve().parent
DATA_DIR: Path = BASE_DIR / "data"                   # .../backend/data
DATASETS_DIR: Path = DATA_DIR / "datasets"           # .../backend/data/datasets
MODEL_PATH: Path = BASE_DIR / "saved_model.pth"      # .../backend/saved_model.pth
DATASETS_DIR.mkdir(parents=True, exist_ok=True)
DATA_DIR.mkdir(parents=True, exist_ok=True)

# ──────────────────────── Модель та сховище ───────────────────────
_model: Optional[SimpleTransformer] = None  # ліниве створення (CPU)


def get_model(input_len: int, target_len: int) -> SimpleTransformer:
    """
    Створює або вантажить модель.
    Якщо є збережений state_dict — підвантажує.
    Якщо ні — ініціалізує нову під задані довжини.
    """
    global _model
    if _model is not None:
        return _model

    loaded = load_model(MODEL_PATH)
    if loaded is not None:
        _model = loaded
        return _model

    # Ініціалізувати нову (типові довжини: X≈441, Y≈441)
    _model = SimpleTransformer(input_seq_len=input_len, target_seq_len=target_len)
    return _model


# ──────────────────────────── DTO-моделі ──────────────────────────
class TrainJSON(BaseModel):
    X_data: List[float] = Field(..., description="Послідовність ознак (вимог) X")
    Y_data: Optional[List[int]] = Field(
        None, description="Вектор цілих токенів Y (21x21=441), якщо є розмітка"
    )
    epochs: int = Field(100, ge=1, le=5000)
    lr: float = Field(0.001, gt=0.0, le=0.1)


class PredictJSON(BaseModel):
    X_data: List[float] = Field(..., description="Послідовність ознак (вимог) X")


# ───────────────────────────── Ендпоїнти ──────────────────────────
@app.get("/api/ping")
def ping():
    return {"status": "ok", "message": "AI Architecture API is alive"}


@app.post("/api/predict")
def predict_endpoint(body: PredictJSON):
    """
    Приймає X_data і повертає передбачену матрицю 21x21 (список списків)
    """
    x = torch.tensor(body.X_data, dtype=torch.float32).unsqueeze(0)  # (1, Lx)

    # Довжину таргету беремо з поточної моделі або типову 441 (21*21)
    model = get_model(input_len=x.shape[1], target_len=441)
    model.eval()

    with torch.no_grad():
        tokens = predict_tokens_greedy(
            model, x, max_len=model.target_seq_len, start_token=START_TOKEN
        )  # (Lt,)

        # Підрізати/доповнити до 441 токенів
        lt = tokens.shape[0]
        if lt < 441:
            pad = torch.zeros(441 - lt, dtype=torch.long)
            tokens = torch.cat([tokens, pad], dim=0)
        elif lt > 441:
            tokens = tokens[:441]

        matrix = tokens.view(21, 21).tolist()
        return {"predicted": matrix}


@app.post("/api/train")
def train_endpoint(body: TrainJSON):
    """
    Донавчання:
      - якщо Y_data подано: тренуємо на (X, Y)
      - якщо Y_data немає: псевдоціль (нули) — лише для адаптації ембеддингів, краще надавати реальний Y
    """
    x = torch.tensor(body.X_data, dtype=torch.float32).unsqueeze(0)  # (1, Lx)
    model = get_model(input_len=x.shape[1], target_len=441)

    if body.Y_data is not None:
        y = torch.tensor(body.Y_data, dtype=torch.long)
        # Безпечно підрівняти до 441
        if y.numel() < 441:
            pad = torch.zeros(441 - y.numel(), dtype=torch.long)
            y = torch.cat([y, pad], dim=0)
        elif y.numel() > 441:
            y = y[:441]
        y = y.view(1, -1)  # (1, Ly)
    else:
        y = torch.zeros((1, 441), dtype=torch.long)

    loss_hist = []
    for _ in range(body.epochs):
        loss = train_once(model, x, y, lr=body.lr, vocab_size=VOCAB_SIZE)
        loss_hist.append(loss)

    save_model(model, MODEL_PATH)
    return {
        "status": "trained",
        "epochs": body.epochs,
        "last_loss": loss_hist[-1],
        "avg_loss": sum(loss_hist) / len(loss_hist),
    }


@app.post("/api/train/upload")
async def train_from_file(
    file: UploadFile = File(...),
    sheet: Optional[str] = Form(None),
    epochs: int = Form(150),
    lr: float = Form(0.001),
):
    """
    Завантаження CSV/Excel:
      ВАРІАНТ A (тільки X): файл містить X-ознаки → self-supervised (псевдоціль)
      ВАРІАНТ B (X+Y): файл містить X і Y → повноцінне навчання на (X, Y)
    Підтримка: .csv, .xlsx. Для Excel можна вказати назву аркуша через sheet; якщо не вказано — автодетект.
    """
    import pandas as pd  # локальний імпорт, щоб уникати важкого імпорту зайвий раз

    content = await file.read()
    buf = io.BytesIO(content)

    # --- LOG: зберегти оригінал файлу
    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    base_name = Path(file.filename or f"dataset_{ts}").stem
    ext = Path(file.filename or "").suffix or ".bin"
    orig_path = DATASETS_DIR / f"{ts}__{base_name}{ext}"
    with open(orig_path, "wb") as f:
        f.write(content)

    # --- парсинг X+Y або тільки X (utils має автодетект аркуша X для .xlsx)
    X_list, Y_tokens = parse_XY_from_tabular(buf, filename=file.filename, sheet_name=sheet)

    if X_list is None:
        # fallback: спробувати тільки X
        buf.seek(0)
        X_list = parse_X_from_tabular(buf, filename=file.filename, sheet_name=sheet)
        if X_list is None:
            return {"status": "error", "message": "Не вдалося прочитати X_data з файлу. Перевір формат."}

    # --- LOG: нормалізовані X/Y окремо
    try:
        pd.DataFrame([X_list]).to_csv(DATASETS_DIR / f"{ts}__X.csv", index=False)
        if Y_tokens is not None:
            pd.DataFrame([Y_tokens]).to_csv(DATASETS_DIR / f"{ts}__Y_0_440.csv", index=False)
    except Exception:
        pass

    x = torch.tensor(X_list, dtype=torch.float32).unsqueeze(0)
    model = get_model(input_len=x.shape[1], target_len=441)

    if Y_tokens is not None:
        y = torch.tensor(Y_tokens, dtype=torch.long)
        if y.numel() < 441:
            pad = torch.zeros(441 - y.numel(), dtype=torch.long)
            y = torch.cat([y, pad], dim=0)
        elif y.numel() > 441:
            y = y[:441]
        y = y.view(1, -1)
    else:
        y = torch.zeros((1, 441), dtype=torch.long)

    loss_hist = []
    epochs = max(1, min(5000, epochs))
    lr = max(1e-6, min(0.1, lr))
    for _ in range(epochs):
        loss = train_once(model, x, y, lr=lr, vocab_size=VOCAB_SIZE)
        loss_hist.append(loss)

    save_model(model, MODEL_PATH)
    return {
        "status": "trained_from_file",
        "epochs": epochs,
        "last_loss": loss_hist[-1],
        "avg_loss": sum(loss_hist) / len(loss_hist),
        "log_files": {
            "original": str(orig_path),
            "X_csv": str(DATASETS_DIR / f"{ts}__X.csv"),
            "Y_csv": (str(DATASETS_DIR / f"{ts}__Y_0_440.csv") if Y_tokens is not None else None),
        },
    }


@app.post("/api/model/reset")
def reset_model():
    """
    Скинути модель до нової ініціалізації
    """
    global _model
    _model = SimpleTransformer(input_seq_len=441, target_seq_len=441)
    save_model(_model, MODEL_PATH)
    return {"status": "reset", "input_len": 441, "target_len": 441}
