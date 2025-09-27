import json
from pathlib import Path

import joblib
import lightgbm as lgb
import numpy as np
import pandas as pd
from fastapi import FastAPI
from pydantic import BaseModel
from sklearn.preprocessing import LabelEncoder
from fastapi.middleware.cors import CORSMiddleware

BASE_DIR = Path(__file__).resolve().parent.parent
MODEL_DIR = BASE_DIR / "models"

app = FastAPI(title="Item Condition Predictor")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3001",
        "http://localhost:3002",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001",
        "http://127.0.0.1:3002",
    ],
    # Allow any Vercel preview/prod domain like https://<project>.vercel.app
    allow_origin_regex=r"https://.*\\.vercel\\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/healthz")
def healthz():
    return {"status": "ok"}

@app.get("/")
def root():
    return {"message": "Item Condition Predictor API"}

text_pipeline = joblib.load(MODEL_DIR / "text_tfidf_logreg.joblib")
encoders = joblib.load(MODEL_DIR / "categorical_encoders.joblib")
seller_stats = pd.read_csv(MODEL_DIR / "seller_share_stats.csv")
with open(MODEL_DIR / "ensemble_metadata.json", "r") as f:
    metadata = json.load(f)
lightgbm_model = lgb.Booster(model_file=str(MODEL_DIR / "lightgbm_tabular.txt"))

seller_stats_map = seller_stats.set_index("seller_id")

class ItemInput(BaseModel):
    seller_id: int
    title: str
    price: float
    shipping_mode: str
    listing_type_id: str
    category_id: str
    has_video: bool = False
    pictures_qty: int = 0
    shipping_free_shipping: bool = False
    shipping_local_pick_up: bool = False
    base_price: float | None = None
    original_price: float | None = None

base_tabular_cols = metadata["base_tabular_cols"]

def compute_seller_share(seller_id: int):
    if seller_id in seller_stats_map.index:
        row = seller_stats_map.loc[seller_id]
        return float(row["seller_share_new_smoothed"]), float(row["seller_total_listings"])
    return float(metadata["seller_share_prior"]), float(metadata["seller_share_smoothing"])


def encode_category(value: str, encoder: LabelEncoder, top_cats):
    mapped = value if value in top_cats else "OTHER"
    classes = list(getattr(encoder, "classes_", []))
    if mapped not in classes:
        mapped = "OTHER" if "OTHER" in classes else (classes[0] if classes else value)
    return int(encoder.transform([mapped])[0])


def preprocess(item: ItemInput):
    text_score = float(text_pipeline.predict_proba([item.title])[0, 1])

    price_over_base = 1.0
    if item.base_price is not None and item.base_price > 0:
        price_over_base = float(item.price / item.base_price)

    seller_share, seller_total = compute_seller_share(item.seller_id)

    features = {col: 0 for col in base_tabular_cols}
    features["log_price"] = float(np.log1p(item.price))
    features["price_over_base"] = price_over_base
    features["has_original_price"] = int(item.original_price is not None)
    features["has_video"] = int(item.has_video)
    features["pictures_qty"] = item.pictures_qty
    features["shipping_free_shipping"] = int(item.shipping_free_shipping)
    features["shipping_local_pick_up"] = int(item.shipping_local_pick_up)
    features["seller_share_new_smoothed"] = seller_share
    features["seller_total_listings"] = seller_total
    features["title_char_len"] = len(item.title)
    features["title_word_len"] = len(item.title.split())

    lower_title = item.title.lower()
    features["kw_nuevo"] = int("nuevo" in lower_title)
    features["kw_usado"] = int("usado" in lower_title)
    features["kw_seminuevo"] = int("seminuevo" in lower_title or "semi nuevo" in lower_title)
    features["kw_sellado"] = int("sellado" in lower_title)
    features["kw_garantia"] = int("garant" in lower_title)

    features["shipping_mode_encoded"] = encode_category(
        item.shipping_mode, encoders["shipping_encoder"], encoders["shipping_top_categories"]
    )
    features["listing_type_encoded"] = encode_category(
        item.listing_type_id, encoders["listing_encoder"], encoders["listing_top_categories"]
    )
    features["category_encoded"] = encode_category(
        item.category_id, encoders["category_encoder"], encoders["category_top_categories"]
    )

    ordered = [features[col] for col in base_tabular_cols] + [
        features["shipping_mode_encoded"],
        features["listing_type_encoded"],
        features["category_encoded"],
        text_score,
    ]
    return np.array([ordered]), text_score


@app.post("/predict")
def predict(item: ItemInput):
    features, text_score = preprocess(item)
    prob = float(lightgbm_model.predict(features)[0])
    return {
        "prediction": "new" if prob >= 0.5 else "used",
        "probability_new": prob,
        "probability_used": 1.0 - prob,
        "text_score": text_score,
    }
