import io
from typing import List, Optional

import torch
from fastapi import FastAPI, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

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

# ──────────────────────── Модель та сховище ───────────────────────
MODEL_PATH = "backend/saved_model.pth"

# Ліниве створення моделі (CPU)
_model: Optional[SimpleTransformer] = None


def get_model(input_len: int, target_len: int) -> SimpleTransformer:
    """
    Створює або вантажить модель.
    Якщо є збережений state_dict — підвантажує.
    Якщо ні — ініціалізує нову під задані довжини.
    """
    global _model
    if _model is not None:
        return _model

    # Спроба завантажити існуючу
    loaded = load_model(MODEL_PATH)
    if loaded is not None:
        _model = loaded
        return _model

    # Ініціалізувати нову (типові довжини : X≈441, Y≈441)
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
        tokens = predict_tokens_greedy(model, x, max_len=model.target_seq_len, start_token=START_TOKEN)  # (Lt,)
        # Безпечно підрізати/доповнити до 441 токенів
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
      - якщо Y_data немає: використовуємо auto-regressive teacher forcing, де ціль — зміщені токени.
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
        # псевдо-ціль: нулі (крім старту) — дозволить стабільно пройти backward,
        y = torch.zeros((1, 441), dtype=torch.long)

    loss_hist = []
    for _ in range(body.epochs):
        loss = train_once(model, x, y, lr=body.lr, vocab_size=VOCAB_SIZE)
        loss_hist.append(loss)

    save_model(model, MODEL_PATH)
    return {"status": "trained", "epochs": body.epochs, "last_loss": loss_hist[-1], "avg_loss": sum(loss_hist) / len(loss_hist)}


@app.post("/api/train/upload")
async def train_from_file(
    file: UploadFile = File(...),
    sheet: Optional[str] = Form(None),
    epochs: int = Form(150),
    lr: float = Form(0.001),
):
    import io, os, time, pandas as pd
    from datetime import datetime

    content = await file.read()
    buf = io.BytesIO(content)

    # --- LOG: зберегти оригінал файлу
    os.makedirs("backend/data/datasets", exist_ok=True)
    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    base_name = os.path.splitext(file.filename or f"dataset_{ts}")[0]
    orig_path = f"backend/data/datasets/{ts}__{base_name}{os.path.splitext(file.filename or '')[1] or '.bin'}"
    with open(orig_path, "wb") as f:
        f.write(content)

    # --- парсинг X+Y або тільки X (з авто-детектом аркуша)
    X_list, Y_tokens = parse_XY_from_tabular(buf, filename=file.filename, sheet_name=sheet)

    if X_list is None:
        # fallback: спробувати тільки X
        buf.seek(0)
        X_list = parse_X_from_tabular(buf, filename=file.filename, sheet_name=sheet)
        if X_list is None:
            return {"status": "error", "message": "Не вдалося прочитати X_data з файлу. Перевір формат."}

    # --- LOG: нормалізовані X/Y окремо
    try:
        import pandas as pd
        pd.DataFrame([X_list]).to_csv(f"backend/data/datasets/{ts}__X.csv", index=False)
        if Y_tokens is not None:
            pd.DataFrame([Y_tokens]).to_csv(f"backend/data/datasets/{ts}__Y_0_440.csv", index=False)
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
            "original": orig_path,
            "X_csv": f"backend/data/datasets/{ts}__X.csv",
            "Y_csv": (f"backend/data/datasets/{ts}__Y_0_440.csv" if Y_tokens is not None else None),
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
