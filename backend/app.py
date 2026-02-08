from flask import Flask, request, jsonify
import pandas as pd
from flask_cors import CORS

from pandas.tseries.offsets import YearEnd
from datetime import datetime

app = Flask(__name__)
CORS(app)

# ----------------------------
# Load and preprocess dataset
# ----------------------------
df = pd.read_csv("data/GraduateEmploymentSurvey.csv")
predictions_df = pd.read_csv("data/GES_with_Predictions.csv")

numeric_columns = [
    "employment_rate_overall",
    "employment_rate_ft_perm",
    "basic_monthly_mean",
    "basic_monthly_median",
    "gross_monthly_mean",
    "gross_monthly_median",
    "gross_mthly_25_percentile",
    "gross_mthly_75_percentile"
]

for col in numeric_columns:
    df[col] = pd.to_numeric(df[col], errors="coerce")

# ----------------------------
# Helper: sanitize NaN for strict JSON
# ----------------------------
def sanitize_for_json(obj):
    """
    Recursively replace numpy.nan with None
    so Flask returns strict JSON.
    """
    if isinstance(obj, dict):
        return {k: sanitize_for_json(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [sanitize_for_json(v) for v in obj]
    if pd.isna(obj):
        return None
    return obj

# ----------------------------
# Metadata endpoints
# ----------------------------
@app.route("/metadata/universities")
def universities():
    return jsonify(
        sorted(df["university"].dropna().str.strip().unique().tolist())
    )

@app.route("/metadata/degrees")
def degrees():
    return jsonify(
        sorted(df["degree"].dropna().str.strip().unique().tolist())
    )

@app.route("/metadata/years")
def years():
    return jsonify({
        "min": int(df["year"].min()),
        "max": int(df["year"].max())
    })

@app.route("/metadata/full")
def metadata_full():
    return jsonify(
        df[["university", "degree"]]
        .dropna()
        .drop_duplicates()
        .to_dict(orient="records")
    )

# ----------------------------
# MARK: Analytics Function 1: Employment Analytics
# ----------------------------
@app.route("/analytics/employment", methods=["POST"])
def employment_analytics():
    payload = request.get_json(silent=True) or {}

    universities = payload.get("universities", [])
    degrees = payload.get("degrees", [])
    start_year = payload.get("start_year")
    end_year = payload.get("end_year")
    enable_prediction = payload.get("enable_prediction", False)

    if start_year is None or end_year is None:
        return jsonify({"error": "start_year and end_year are required"}), 400
    if start_year > end_year:
        return jsonify({"error": "start_year cannot be greater than end_year"}), 400
    if not universities:
        return jsonify({"error": "At least one university is required"}), 400
    if not degrees:
        return jsonify({"error": "At least one degree is required"}), 400

    if enable_prediction:
        data = predictions_df.copy()
        end_year = int(data["year"].unique().max())
    else:
        data = df.copy()
        data["data_source"] = "actual"

    data = data[data["university"].isin(universities)]
    data = data[data["degree"].isin(degrees)]
    data = data[(data["year"] >= start_year) & (data["year"] <= end_year)]

    if data.empty:
        return jsonify({"error": "No data found for the selected filters."}), 404

    full_years = list(range(start_year, end_year + 1))

    course_keys = data[["university", "degree"]].drop_duplicates()

    grid_rows = []
    for _, row in course_keys.iterrows():
        for y in full_years:
            grid_rows.append({
                "university": row["university"],
                "degree": row["degree"],
                "year": y
            })
    grid_df = pd.DataFrame(grid_rows)

    agg_df = (
        data.groupby(["university", "degree", "year"], as_index=False)
        .agg({
            "employment_rate_overall": "mean",
            "employment_rate_ft_perm": "mean",
            "data_source": "first"
        })
    )

    merged = pd.merge(
        grid_df,
        agg_df,
        on=["university", "degree", "year"],
        how="left"
    )

    def nan_to_none(x):
        return None if pd.isna(x) else float(x)

    merged["employment_rate_overall"] = merged["employment_rate_overall"].apply(nan_to_none)
    merged["employment_rate_ft_perm"] = merged["employment_rate_ft_perm"].apply(nan_to_none)

    series = []
    for (uni, deg), group in merged.groupby(["university", "degree"], sort=True):
        group = group.sort_values("year")
        series.append({
            "university": uni,
            "degree": deg,
            "years": group["year"].astype(int).tolist(),
            "overall_employment_rate": group["employment_rate_overall"].tolist(),
            "full_time_employment_rate": group["employment_rate_ft_perm"].tolist(),
            "data_source": group["data_source"].tolist()
        })

    response = {
        "filters": {
            "universities": universities,
            "degrees": degrees,
            "start_year": start_year,
            "end_year": end_year
        },
        "year_range": full_years,
        "series": series
    }

    return jsonify(sanitize_for_json(response))

# ----------------------------
# Analytics Function 2: Salary Distribution & Comparison
# (unchanged from your version — left as-is)
# ----------------------------
@app.route("/analytics/salary-comparison")
def salary_comparison():
    year = request.args.get("year", type=int)
    start_year = request.args.get("start_year", type=int)
    end_year = request.args.get("end_year", type=int)

    group_by = request.args.get("group_by", default="university")
    selected_universities = request.args.getlist("universities")
    selected_degrees = request.args.getlist("degrees")
    aggregate = request.args.get("aggregate", default="0") == "1"

    prediction_raw = request.args.get("enable_prediction", "false").lower()
    enable_prediction = prediction_raw == "true"

    if group_by not in ["university", "degree"]:
        return jsonify({"error": "group_by must be 'university' or 'degree'"}), 400

    if start_year is None and end_year is None:
        if year is None:
            return jsonify({"error": "Missing required parameter: year OR start_year & end_year"}), 400
        start_year = year
        end_year = year

    if start_year is None or end_year is None:
        return jsonify({"error": "Both start_year and end_year are required for a range"}), 400

    if start_year > end_year:
        return jsonify({"error": "start_year cannot be later than end_year"}), 400

    if enable_prediction:
        data = predictions_df.copy()
        end_year = int(data["year"].unique().max())
    else:
        data = df.copy()
        data["data_source"] = "actual"

    data = data[(data["year"] >= start_year) & (data["year"] <= end_year)]

    if group_by == "university" and selected_universities:
        data = data[data["university"].isin(selected_universities)]
    if group_by == "degree" and selected_degrees:
        data = data[data["degree"].isin(selected_degrees)]

    data = data.dropna(subset=["gross_monthly_mean", "gross_monthly_median"])
    if data.empty:
        return jsonify({"error": "No salary data found for the selected filters."}), 404

    selection_was_empty = (
        (group_by == "university" and not selected_universities) or
        (group_by == "degree" and not selected_degrees)
    )

    items = None
    if selection_was_empty:
        snapshot = data[data["year"] == end_year]
        if snapshot.empty:
            snapshot = data

        top = (
            snapshot.groupby(group_by)[["gross_monthly_median"]]
            .mean()
            .reset_index()
            .sort_values("gross_monthly_median", ascending=False)
            .head(5)
        )
        items = top[group_by].tolist()
        data = data[data[group_by].isin(items)]
    else:
        items = selected_universities if group_by == "university" else selected_degrees

    label_col = group_by
    if group_by == "degree" and aggregate:
        label_col = "university"

    years = list(range(start_year, end_year + 1))

    grouped = (
        data.groupby([label_col, "year"], as_index=False)
        .agg({
            "gross_monthly_mean": "mean",
            "gross_monthly_median": "mean",
            "data_source": "first"
        })
    )

    if group_by == "degree" and aggregate:
        items_for_series = sorted(grouped[label_col].dropna().unique().tolist())
    else:
        items_for_series = items

    series = []
    for item in items_for_series:
        item_df = grouped[grouped[label_col] == item]

        mean_map = dict(zip(item_df["year"], item_df["gross_monthly_mean"]))
        median_map = dict(zip(item_df["year"], item_df["gross_monthly_median"]))
        source_map = dict(zip(item_df["year"], item_df["data_source"]))

        mean_vals = [None if pd.isna(mean_map.get(y)) else float(mean_map.get(y)) for y in years]
        median_vals = [None if pd.isna(median_map.get(y)) else float(median_map.get(y)) for y in years]
        source_vals = [source_map.get(y, "actual") for y in years]

        series.append({
            "label": item,
            "mean": mean_vals,
            "median": median_vals,
            "data_source": source_vals
        })

    return jsonify(sanitize_for_json({
        "filters": {
            "group_by": group_by,
            "universities": selected_universities,
            "degrees": selected_degrees,
            "start_year": start_year,
            "end_year": end_year,
            "top5_default": selection_was_empty,
            "aggregate": aggregate
        },
        "years": years,
        "series": series
    }))

# ----------------------------
# Analytics Function 3: Salary Dispersion
# ----------------------------
@app.route("/analytics/salary-dispersion", methods=["POST"])
def salary_dispersion():
    payload = request.get_json(silent=True) or {}

    universities = payload.get("universities", [])
    degrees = payload.get("degrees", [])
    year = payload.get("year")

    if year is None:
        return jsonify({"error": "year is required"}), 400

    if not degrees:
        return jsonify({"error": "At least one degree must be selected"}), 400

    if len(degrees) > 7:
        return jsonify({"error": "A maximum of 7 degrees can be selected"}), 400

    data = df.copy()
    data = data[data["year"] == int(year)]
    data = data[data["degree"].isin(degrees)]

    if universities:
        data = data[data["university"].isin(universities)]

    if data.empty:
        return jsonify({"error": "No data found for the selected filters"}), 404

    cols = [
        "university",
        "degree",
        "gross_mthly_25_percentile",
        "gross_monthly_median",
        "gross_mthly_75_percentile"
    ]
    data = data[cols]

    for col in cols[2:]:
        data[col] = pd.to_numeric(data[col], errors="coerce")

    data = data.dropna(
        subset=[
            "gross_mthly_25_percentile",
            "gross_monthly_median",
            "gross_mthly_75_percentile"
        ],
        how="all"
    )

    if data.empty:
        return jsonify({"error": "No valid salary dispersion data available"}), 404

    grouped = (
        data
        .groupby(["degree", "university"], as_index=False)
        .agg({
            "gross_mthly_25_percentile": "mean",
            "gross_monthly_median": "mean",
            "gross_mthly_75_percentile": "mean"
        })
    )

    series = []
    for _, row in grouped.iterrows():
        series.append({
            "label": f"{row['degree']} ({row['university']})",
            "p25": None if pd.isna(row["gross_mthly_25_percentile"]) else float(row["gross_mthly_25_percentile"]),
            "median": None if pd.isna(row["gross_monthly_median"]) else float(row["gross_monthly_median"]),
            "p75": None if pd.isna(row["gross_mthly_75_percentile"]) else float(row["gross_mthly_75_percentile"]),
        })

    return jsonify(sanitize_for_json({
        "year": int(year),
        "series": series
    }))

@app.route("/analytics/salary-dispersion/validate", methods=["POST"])
def validate_salary_dispersion():
    payload = request.get_json(silent=True) or {}

    universities = payload.get("universities", [])
    degrees = payload.get("degrees", [])
    year = payload.get("year")

    if year is None:
        return jsonify({"error": "year is required"}), 400

    if not degrees:
        return jsonify({"error": "At least one degree is required"}), 400

    data = df.copy()
    data = data[data["year"] == int(year)]
    data = data[data["degree"].isin(degrees)]

    if universities:
        data = data[data["university"].isin(universities)]

    # Only keep rows with at least one dispersion value
    data = data.dropna(
        subset=[
            "gross_mthly_25_percentile",
            "gross_monthly_median",
            "gross_mthly_75_percentile",
        ],
        how="all",
    )

    valid = []
    invalid = []

    # Build lookup of valid (degree, university)
    valid_pairs = set(
        (row["degree"], row["university"])
        for _, row in data.iterrows()
    )

    for deg in degrees:
        matched = False
        for uni in universities or df["university"].unique():
            if (deg, uni) in valid_pairs:
                matched = True
                valid.append(f"{deg} ({uni})")
        if not matched:
            invalid.append(deg)

    return jsonify({
        "year": int(year),
        "valid": sorted(set(valid)),
        "invalid": sorted(set(invalid)),
        "valid_count": len(set(valid)),
        "invalid_count": len(set(invalid)),
    })


if __name__ == "__main__":
    app.run(debug=True)
