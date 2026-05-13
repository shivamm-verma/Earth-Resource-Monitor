from fastapi import FastAPI, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from transformers import (SegformerImageProcessor,
                          SegformerForSemanticSegmentation)
import torch, torch.nn.functional as F
import numpy as np
from PIL import Image
from scipy import stats as scipy_stats
import json, io, os
from typing import List, Annotated

app = FastAPI()
app.add_middleware(CORSMiddleware, allow_origins=["*"],
                   allow_methods=["*"], allow_headers=["*"])

# ── Find model directory ──────────────────────────────────────
BASE_DIR  = os.path.dirname(os.path.abspath(__file__))
MODEL_DIR = os.path.join(BASE_DIR, "model")

print(f"BASE_DIR:  {BASE_DIR}")
print(f"MODEL_DIR: {MODEL_DIR}")
print(f"Contents:  {os.listdir(MODEL_DIR) if os.path.exists(MODEL_DIR) else 'NOT FOUND'}")

# If preprocessor_config.json is not in the model dir, look for a nested subdirectory
if os.path.exists(MODEL_DIR) and not os.path.exists(os.path.join(MODEL_DIR, "preprocessor_config.json")):
    contents = os.listdir(MODEL_DIR)
    if contents and os.path.isdir(os.path.join(MODEL_DIR, contents[0])):
        MODEL_DIR = os.path.join(MODEL_DIR, contents[0])
        print(f"Model found in subdirectory: {MODEL_DIR}")

# ── Load model once at startup ────────────────────────────────
DEVICE = torch.device("cpu")

processor = SegformerImageProcessor.from_pretrained(MODEL_DIR)
model     = SegformerForSemanticSegmentation.from_pretrained(MODEL_DIR)
model.to(DEVICE).eval()
print("Model loaded.")

# ── Class definitions ─────────────────────────────────────────
CLASS_NAMES = ["Forest","Water","Ice/Snow","Urban",
               "Barren","Grassland","Cropland","Wetland"]
CLASS_COLORS = np.array([
    [34,139,34],[30,144,255],[220,240,255],[220,50,50],
    [205,170,110],[154,205,50],[255,215,0],[72,209,204]
], dtype=np.uint8)
NUM_CLASSES = len(CLASS_NAMES)

# ── Inference helpers ─────────────────────────────────────────
def segment_image(img_array: np.ndarray):
    H, W = img_array.shape[:2]
    inputs = processor(images=img_array, return_tensors="pt")
    with torch.no_grad():
        logits = model(
            pixel_values=inputs["pixel_values"].to(DEVICE)
        ).logits
    logits_up = F.interpolate(logits, size=(H, W),
                               mode="bilinear", align_corners=False)
    return logits_up.argmax(dim=1).squeeze().cpu().numpy().astype(np.uint8)

def compute_area_stats(mask):
    total = mask.size
    return {
        cls: {
            "pixels": int((mask == i).sum()),
            "pct": round(float((mask == i).sum()) / total * 100, 2)
        }
        for i, cls in enumerate(CLASS_NAMES)
    }

# ── Temporal analysis ─────────────────────────────────────────
def run_temporal_analysis(image_year_pairs, future_years):
    pairs_sorted = sorted(image_year_pairs, key=lambda x: x[1])
    years, all_stats = [], []

    for img_arr, year in pairs_sorted:
        mask  = segment_image(img_arr)
        years.append(year)
        all_stats.append(compute_area_stats(mask))

    years_np    = np.array(years)
    time_series = {
        cls: [s[cls]["pct"] for s in all_stats]
        for cls in CLASS_NAMES
    }

    results = {}
    for cls in CLASS_NAMES:
        y = np.array(time_series[cls])
        slope, intercept, r, p_val, _ = scipy_stats.linregress(years_np, y)

        poly_coeffs = np.polyfit(years_np, y,
                                  deg=2 if len(years_np) >= 3 else 1)

        results[cls] = {
            "observed": {str(yr): val
                         for yr, val in zip(years, time_series[cls])},
            "slope_pct_per_yr": round(float(slope), 4),
            "r_squared":        round(float(r**2), 4),
            "p_value":          round(float(p_val), 6),
            "total_change_pct": round(float(y[-1] - y[0]), 4),
            "trend": "rising" if slope > 0 else "falling",
            "predictions": {
                str(yr): {
                    "linear": round(float(
                        np.clip(slope*yr + intercept, 0, 100)), 2),
                    "poly":   round(float(
                        np.clip(np.polyval(poly_coeffs, yr), 0, 100)), 2),
                }
                for yr in future_years
            }
        }

    return {"years": years, "per_class": results}

# ── Route ─────────────────────────────────────────────────────
@app.post("/analyse")
async def analyse(
    files: Annotated[List[UploadFile], File(description="Upload 3 satellite images")],
    years: Annotated[str, Form(description='JSON array of years e.g. [1998, 2005, 2022]')],
    future_years: Annotated[str, Form(description='JSON array e.g. [2030, 2040, 2050]')] = "[2030,2040,2050]"
):
    year_list   = json.loads(years)
    future_list = json.loads(future_years)

    if len(files) != len(year_list):
        return {"error": "Image count must match year count."}

    pairs = []
    for f, yr in zip(files, year_list):
        raw = await f.read()
        img = np.array(Image.open(io.BytesIO(raw)).convert("RGB"))
        pairs.append((img, int(yr)))

    output = run_temporal_analysis(pairs, future_list)
    return {"status": "ok", "results": output}

@app.get("/health")
def health():
    return {"status": "ok", "classes": CLASS_NAMES}