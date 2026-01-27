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
    university = request.args.get("university")
    degree = request.args.get("degree")
    start_year = request.args.get("start_year", type=int)
    end_year = request.args.get("end_year", type=int)

    data = df

    # Apply filters
    if university:
        data = data[data["university"] == university]
    if degree:
        data = data[data["degree"] == degree]
    if start_year:
        data = data[data["year"] >= start_year]
    if end_year:
        data = data[data["year"] <= end_year]

    if data.empty:
        return jsonify({"error": "No data found for the selected filters."}), 404

    # ---- Summary statistics ----
    overall_mean = data["employment_rate_overall"].mean()
    ft_mean = data["employment_rate_ft_perm"].mean()

    summary = {
        "overall_employment_rate": round(overall_mean, 2) if pd.notnull(overall_mean) else None,
        "full_time_employment_rate": round(ft_mean, 2) if pd.notnull(ft_mean) else None
    }

    # ---- Trend analysis ----
    trend_df = (
        data.groupby("year")[["employment_rate_overall", "employment_rate_ft_perm"]]
        .mean()
        .reset_index()
        .sort_values("year")
    )

    # Drop years with no usable employment data (e.g. incomplete 2023)
    trend_df = trend_df.dropna(
        subset=["employment_rate_overall", "employment_rate_ft_perm"],
        how="all"
    )

    # Convert NaN → None (JSON-safe)
    trend_df = trend_df.where(pd.notnull(trend_df), None)

    trend = {
        "years": trend_df["year"].tolist(),
        "overall": trend_df["employment_rate_overall"].tolist(),
        "full_time": trend_df["employment_rate_ft_perm"].tolist()
    }

    return jsonify({
        "filters": {
            "university": university,
            "degree": degree,
            "start_year": start_year,
            "end_year": end_year
        },
        "summary": summary,
        "trend": trend
    })

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

# ----------------------------
# Analytics Function 3: Trend Analysis Over Time
# ----------------------------
# @app.route("/analytics/trends")
# def trends():

if __name__ == "__main__":
    app.run(debug=True)
