# Mercado Libre Item Condition Prediction – Technical Challenge (DS + GenAI)

Predict whether a Mercado Libre listing is new or used using a production-minded pipeline: robust EDA, feature engineering, multiple text/tabular baselines, an ensemble (TF‑IDF + Logistic Regression text score + LightGBM tabular), experiment tracking with MLflow, and a demo app (FastAPI backend + Next.js frontend).

## Contents
- Overview and goals
- Environment and setup
- Data and EDA highlights
- Modeling and experiments
- Final system and feature importance
- API and frontend
- How to run locally
- Deployment notes
- Next steps

## Overview and goals
- Dataset: `MLA_100k.jsonlines` (100k listings, nested schema).
- Target: `condition` ∈ {new, used}.
- Primary metric: Accuracy (goal ≥ 0.86).
- Secondary metrics: F1, Precision, Recall, plus training/inference time.
- Tracking: MLflow experiment `title_tfidf_baselines`.

## Environment and setup
Python 3.12 recommended.

```bash
# Create and activate venv
python -m venv .venv
source .venv/bin/activate

# Install project dependencies
pip install -r requirements.txt

# If LightGBM complains about libomp on macOS (Apple Silicon):
brew install libomp
```

Optional: Jupyter for notebooks.
```bash
python -m pip install jupyter
```

## Data and EDA highlights
Primary exploration: `EDA.ipynb`.

Key steps and insights:
- Flatten nested JSON and engineer signals from lists/dicts using `build_feature_table`.
- Text signals (titles, descriptions): TF‑IDF n‑grams (1–2), χ² and log‑odds rankings, Spanish pattern flags (e.g., "nuevo", "usado", "seminuevo", "sellado", "0km", "garant…"). Plots show top tokens favoring each class.
- Price normalization: `log(price)`, discount and base/original price ratios.
- Inventory velocity: sold vs time (if available), availability bins.
- Seller priors: `seller_share_new_smoothed` (Bayesian smoothing) + `seller_total_listings`.
- Listing/shipping metadata: `listing_type_id`, `shipping.mode`, free shipping/pickup.
- Media and attributes: `pictures_qty`, `has_video`, attributes count.
- Geography/time and missingness flags; correlation analysis centered on target.

Artifacts exported under `processed/`:
- `mla_items_features.parquet/jsonlines`: engineered features.
- `baseline_text.jsonlines`, `baseline_tabular.jsonlines` and original with/without labels for modeling.

## Modeling and experiments
All baselines and experiments are in `modeling.ipynb` and tracked with MLflow.

Text-only baselines:
- TF‑IDF (1–2 grams) + Random Forest: solid baseline.
- TF‑IDF (1–2 grams, min_df=3) + Logistic Regression (balanced): best text‑only baseline in both CV and hold‑out.
- BiLSTM + fastText Spanish embeddings (PyTorch, MPS/CUDA): trains and converges; slightly below the TF‑IDF + LogReg baseline while heavier to serve.
- BETO (Spanish BERT) fine‑tune (optional): implemented with HF `datasets/transformers`.

Ensembles:
- XGBoost variant using TF‑IDF LogReg text score + tabular features.
- Final serving system uses LightGBM with the same inputs; early stopping used during development (see notebook). Exact metrics and timings logged to MLflow; ensemble improves upon text‑only baselines and is designed to meet the ≥0.86 accuracy goal.

## Final system and feature importance
Serving pipeline:
1. Compute `text_score` = P(new | title) from the saved TF‑IDF + Logistic Regression pipeline.
2. Build tabular vector (price/log-price, discounts, media counts, shipping and listing encodings, seller priors, title lengths, Spanish keyword flags, category encoding, etc.).
3. Predict with LightGBM.

Feature importance (see notebook section “Feature importance analysis”):
- `text_score` ranks among the most influential features.
- Strong tabular contributors: `log_price`, `seller_share_new_smoothed`, `category_encoded`, `shipping_mode_encoded`, `price_over_base`, `title_char_len/title_word_len`, and Spanish keyword flags.

## API and frontend
- Backend: `backend/main.py` (FastAPI)
  - Endpoint: `POST /predict`
  - Input JSON (raw form fields):
    - `seller_id`, `title`, `price`, `shipping_mode`, `listing_type_id`, `category_id`, `has_video`, `pictures_qty`, `shipping_free_shipping`, `shipping_local_pick_up`, optional `base_price`, `original_price`.
  - Output JSON: `{ prediction: 'new'|'used', probability_new, probability_used, text_score }`.
  - Robustness: CORS enabled for local dev; unseen categories fall back to known encodings; `seller_share_new_smoothed` falls back to a prior for unseen sellers.
  - Unit tests: `backend/tests/test_api.py` (3 tests pass).

- Frontend: `frontend` (Next.js App Router + Tailwind)
  - Mercado Libre-styled UI with a form that calls the backend and displays probabilities and text score.
  - Configure `NEXT_PUBLIC_API_BASE_URL` for deployment; defaults to `http://localhost:8000`.

Saved artifacts for serving: `models/`
- `text_tfidf_logreg.joblib` (text pipeline)
- `lightgbm_tabular.txt` (final booster)
- `categorical_encoders.joblib` (encoders and top‑k categories)
- `seller_share_stats.csv` (priors)
- `ensemble_metadata.json` (column order, paths, smoothing params)

## How to run locally
Backend:
```bash
source .venv/bin/activate
uvicorn backend.main:app --reload --host 127.0.0.1 --port 8000
```

Frontend:
```bash
cd frontend
npm run dev
# open the printed URL (e.g., http://localhost:3000)
```

## Deployment notes
- Frontend (Vercel): set `NEXT_PUBLIC_API_BASE_URL` to the public URL of your FastAPI service.
- Backend: deploy to your preferred service (e.g., Render/Fly/EC2). Ensure the model artifacts in `models/` are present and readable.
- CORS: update allowed origins in `backend/main.py` for your production domain.

## Potential Next steps for further improvement
- Probability calibration and decision thresholds by category.
- Richer text signals (char n‑grams, domain lexicons), multilingual handling.
- SHAP/PI plots for LightGBM to complement impurity importances.
- Hardening: input validation, rate limiting, structured logging.

---

<sub>© Raul Salles de Padua</sub>
