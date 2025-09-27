import sys
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parents[2]
if str(ROOT_DIR) not in sys.path:
    sys.path.append(str(ROOT_DIR))

from fastapi.testclient import TestClient
import json
import pathlib

from backend import main

client = TestClient(main.app)

MODEL_DIR = main.MODEL_DIR

seller_stats_map = main.seller_stats_map
encoders = main.encoders
metadata = main.metadata


def _sample_payload(existing: bool = True):
    title = "Auriculares Samsung Originales Manos Libres"
    base_payload = {
        "title": title,
        "price": 999.0,
        "shipping_mode": encoders["shipping_top_categories"][0] if encoders["shipping_top_categories"] else "not_specified",
        "listing_type_id": encoders["listing_top_categories"][0] if encoders["listing_top_categories"] else "bronze",
        "category_id": encoders["category_top_categories"][0] if encoders["category_top_categories"] else "OTHER",
        "has_video": False,
        "pictures_qty": 3,
        "shipping_free_shipping": False,
        "shipping_local_pick_up": True,
        "base_price": None,
        "original_price": None,
    }

    if existing and not seller_stats_map.empty:
        seller_id = int(seller_stats_map.index[0])
    else:
        seller_id = 10_000_000_000

    base_payload["seller_id"] = seller_id
    return base_payload


def test_predict_success_existing_seller():
    payload = _sample_payload(existing=True)
    response = client.post("/predict", json=payload)
    assert response.status_code == 200

    data = response.json()
    assert data["prediction"] in {"new", "used"}
    assert 0.0 <= data["probability_new"] <= 1.0
    assert 0.0 <= data["probability_used"] <= 1.0
    assert abs(data["probability_new"] + data["probability_used"] - 1) < 1e-6
    assert 0.0 <= data["text_score"] <= 1.0


def test_predict_success_unknown_seller():
    payload = _sample_payload(existing=False)
    response = client.post("/predict", json=payload)
    assert response.status_code == 200

    data = response.json()
    assert data["prediction"] in {"new", "used"}
    assert 0.0 <= data["probability_new"] <= 1.0
    assert 0.0 <= data["text_score"] <= 1.0


def test_predict_handles_out_of_vocab_categories():
    payload = _sample_payload(existing=True)
    payload.update(
        {
            "shipping_mode": "some_new_mode",
            "listing_type_id": "brand_new_listing",
            "category_id": "UNSEEN_CATEGORY",
        }
    )

    response = client.post("/predict", json=payload)
    assert response.status_code == 200

    data = response.json()
    assert data["prediction"] in {"new", "used"}
