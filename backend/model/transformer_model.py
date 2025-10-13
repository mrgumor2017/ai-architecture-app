from typing import Optional

import torch
import torch.nn as nn
import torch.optim as optim

# ───────── Константи токенів ─────────
# 0,1,2 — класи з Y; 3 — спецтокен (start)
VOCAB_SIZE = 4
START_TOKEN = 3


# ───────── Positional Encoding ─────────
class PositionalEncoding(nn.Module):
    def __init__(self, d_model: int, max_len: int = 6000):
        super().__init__()
        pe = torch.zeros(max_len, d_model)
        position = torch.arange(0, max_len, dtype=torch.float32).unsqueeze(1)
        div_term = torch.exp(torch.arange(0, d_model, 2, dtype=torch.float32) * (-torch.log(torch.tensor(10000.0)) / d_model))
        pe[:, 0::2] = torch.sin(position * div_term)
        pe[:, 1::2] = torch.cos(position * div_term)
        pe = pe.unsqueeze(0)  # (1, max_len, d_model)
        self.register_buffer("pe", pe)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        x = x + self.pe[:, : x.size(1)]
        return x


# ───────── Модель ─────────
class SimpleTransformer(nn.Module):
    def __init__(
        self,
        input_seq_len: int = 441,
        target_seq_len: int = 441,
        d_model: int = 128,
        nhead: int = 8,
        num_layers: int = 3,
        vocab_size: int = VOCAB_SIZE,
    ):
        super().__init__()
        self.input_seq_len = input_seq_len
        self.target_seq_len = target_seq_len

        self.input_embed = nn.Linear(1, d_model)
        self.pos_encoder = PositionalEncoding(d_model)

        self.output_embed = nn.Embedding(vocab_size, d_model)
        self.pos_decoder = PositionalEncoding(d_model)

        self.transformer = nn.Transformer(
            d_model=d_model,
            nhead=nhead,
            num_encoder_layers=num_layers,
            num_decoder_layers=num_layers,
            batch_first=False,  # будемо переставляти (S,B,E)
        )

        self.fc_out = nn.Linear(d_model, vocab_size)

    def forward(self, src: torch.Tensor, tgt: torch.Tensor) -> torch.Tensor:
        """
        src: (B, Ls) floats
        tgt: (B, Lt) long (tokens)
        return: (B, Lt, vocab)
        """
        # SRC
        s = src.unsqueeze(-1)  # (B, Ls, 1)
        s = self.input_embed(s)  # (B, Ls, d)
        s = self.pos_encoder(s)  # (B, Ls, d)
        s = s.permute(1, 0, 2)   # (Ls, B, d)

        # TGT
        t = self.output_embed(tgt)   # (B, Lt, d)
        t = self.pos_decoder(t)      # (B, Lt, d)
        t = t.permute(1, 0, 2)       # (Lt, B, d)

        # casual mask для автогенерації
        device = tgt.device
        tgt_mask = nn.Transformer.generate_square_subsequent_mask(t.size(0)).to(device)

        out = self.transformer(s, t, tgt_mask=tgt_mask)  # (Lt, B, d)
        out = out.permute(1, 0, 2)  # (B, Lt, d)
        logits = self.fc_out(out)   # (B, Lt, vocab)
        return logits


# ───────── One-step train ─────────
def train_once(
    model: SimpleTransformer,
    x: torch.Tensor,      # (B, Lx) floats
    y: torch.Tensor,      # (B, Ly) longs (цільові токени 0..(vocab-1))
    lr: float = 1e-3,
    vocab_size: int = VOCAB_SIZE,
) -> float:
    """
    Один прохід з teacher forcing:
      tgt_inp = [START] + y[:-1]
      loss = CrossEntropy(logits, y)
    """
    device = torch.device("cpu")
    model.to(device)
    x = x.to(device)
    y = y.to(device)

    # готуємо tgt_inp
    start_col = torch.full((y.size(0), 1), START_TOKEN, dtype=torch.long, device=device)
    tgt_inp = torch.cat([start_col, y[:, :-1]], dim=1)  # (B, Ly)

    model.train()
    optimizer = optim.Adam(model.parameters(), lr=lr)
    criterion = nn.CrossEntropyLoss()

    optimizer.zero_grad()
    logits = model(x, tgt_inp)  # (B, Ly, vocab)
    loss = criterion(logits.reshape(-1, vocab_size), y.reshape(-1))
    loss.backward()
    optimizer.step()

    return float(loss.detach().cpu().item())


# ───────── Greedy decode ─────────
def predict_tokens_greedy(
    model: SimpleTransformer,
    x: torch.Tensor,             # (B=1, Lx)
    max_len: int,
    start_token: int = START_TOKEN,
) -> torch.Tensor:
    """
    Генерує послідовність токенів довжини ≤ max_len з greedy-стратегією.
    """
    device = torch.device("cpu")
    model.eval()
    model.to(device)
    x = x.to(device)

    tgt = torch.full((1, 1), start_token, dtype=torch.long, device=device)  # (1,1)
    out_tokens = []

    with torch.no_grad():
        for _ in range(max_len):
            logits = model(x, tgt)         # (1, Lt, vocab)
            next_token = logits[:, -1, :].argmax(dim=-1, keepdim=True)  # (1,1)
            tgt = torch.cat([tgt, next_token], dim=1)
            out_tokens.append(int(next_token.item()))

    return torch.tensor(out_tokens, dtype=torch.long)
