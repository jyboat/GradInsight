from flask import Flask, request, jsonify
import pandas as pd
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

# ----------------------------
# Load and preprocess dataset
# ----------------------------
df = pd.read_csv("data/GraduateEmploymentSurvey.csv")

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

# ----------------------------
# Employment Analytics
# ----------------------------
@app.route("/analytics/employment")
def employment_analytics():
    universities = request.args.getlist("universities")
    degrees = request.args.getlist("degrees")
    start_year = request.args.get("start_year", type=int)
    end_year = request.args.get("end_year", type=int)

    if start_year is None or end_year is None:
        return jsonify({"error": "start_year and end_year are required"}), 400
    if start_year > end_year:
        return jsonify({"error": "start_year cannot be greater than end_year"}), 400
    if not universities:
        return jsonify({"error": "At least one university is required"}), 400
    if not degrees:
        return jsonify({"error": "At least one degree is required"}), 400

    data = df.copy()

    # Apply filters (multi-select)
    data = data[data["university"].isin(universities)]
    data = data[data["degree"].isin(degrees)]
    data = data[(data["year"] >= start_year) & (data["year"] <= end_year)]

    if data.empty:
        return jsonify({"error": "No data found for the selected filters."}), 404

    full_years = list(range(start_year, end_year + 1))

    # Build complete grid: (university, degree) x year
    course_keys = data[["university", "degree"]].drop_duplicates()

    grid_rows = []
    for _, row in course_keys.iterrows():
        for y in full_years:
            grid_rows.append({"university": row["university"], "degree": row["degree"], "year": y})
    grid_df = pd.DataFrame(grid_rows)

    # Aggregate actual data
    agg_df = (
        data.groupby(["university", "degree", "year"], as_index=False)[
            ["employment_rate_overall", "employment_rate_ft_perm"]
        ]
        .mean()
    )

    merged = pd.merge(
        grid_df,
        agg_df,
        on=["university", "degree", "year"],
        how="left"
    )

    # ---- CRITICAL: convert NaN -> None safely ----
    def nan_to_none(x):
        # pandas/numpy NaN check
        return None if pd.isna(x) else float(x)

    merged["employment_rate_overall"] = merged["employment_rate_overall"].apply(nan_to_none)
    merged["employment_rate_ft_perm"] = merged["employment_rate_ft_perm"].apply(nan_to_none)

    # Build response series
    series = []
    for (uni, deg), group in merged.groupby(["university", "degree"], sort=True):
        group = group.sort_values("year")
        series.append({
            "university": uni,
            "degree": deg,
            "years": group["year"].astype(int).tolist(),
            "overall_employment_rate": group["employment_rate_overall"].tolist(),
            "full_time_employment_rate": group["employment_rate_ft_perm"].tolist()
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


    
@app.route("/metadata/full")
def metadata_full():
    return jsonify(
        df[["university", "degree"]]
        .dropna()
        .drop_duplicates()
        .to_dict(orient="records")
    )

# ----------------------------
# Analytics Function 2: Salary Distribution & Comparison
# ----------------------------
@app.route("/analytics/salary-comparison")
def salary_comparison():
    year = request.args.get("year", type=int)
    group_by = request.args.get("group_by", default="university")  # university or degree

    selected_universities = request.args.getlist("universities") 
    selected_degrees = request.args.getlist("degrees")            

    if year is None:
        return jsonify({"error": "Missing required parameter: year"}), 400
    if group_by not in ["university", "degree"]:
        return jsonify({"error": "group_by must be 'university' or 'degree'"}), 400

    data = df.copy()
    data = data[data["year"] == year]

    if group_by == "university" and selected_universities:
        data = data[data["university"].isin(selected_universities)]

    if group_by == "degree" and selected_degrees:
        data = data[data["degree"].isin(selected_degrees)]

    data = data.dropna(subset=["gross_monthly_mean", "gross_monthly_median"])

    if data.empty:
        return jsonify({"error": "No salary data found for the selected filters."}), 404

    grouped = (
        data.groupby(group_by)[
            ["gross_monthly_mean", "gross_monthly_median", "gross_mthly_25_percentile", "gross_mthly_75_percentile"]
        ]
        .mean()
        .reset_index()
        .sort_values("gross_monthly_median", ascending=False)
    )

    if (group_by == "university" and not selected_universities) or (group_by == "degree" and not selected_degrees):
        grouped = grouped.head(5)

    grouped = grouped.where(pd.notnull(grouped), None)

    return jsonify({
        "filters": {
            "year": year,
            "group_by": group_by,
            "universities": selected_universities,
            "degrees": selected_degrees
        },
        "labels": grouped[group_by].tolist(),
        "mean": grouped["gross_monthly_mean"].tolist(),
        "median": grouped["gross_monthly_median"].tolist(),
        "p25": grouped["gross_mthly_25_percentile"].tolist(),
        "p75": grouped["gross_mthly_75_percentile"].tolist()
    })

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
# Analytics Function 3: Trend Analysis Over Time
# ----------------------------
# @app.route("/analytics/trends")
# def trends():

if __name__ == "__main__":
    app.run(debug=True)
