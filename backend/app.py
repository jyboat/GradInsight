from flask import Flask, request, jsonify
import pandas as pd
from flask_cors import CORS

app = Flask(__name__)
CORS(app)   

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

@app.route("/metadata/universities")
def universities():
    return jsonify(sorted(df["university"].unique().tolist()))

@app.route("/metadata/degrees")
def degrees():
    return jsonify(sorted(df["degree"].dropna().str.strip().unique().tolist()))


@app.route("/metadata/years")
def years():
    return jsonify({
        "min": int(df["year"].min()),
        "max": int(df["year"].max())
    })

@app.route("/analytics/employment-rate")
def employment_rate():
    university = request.args.get("university")
    degree = request.args.get("degree")
    start_year = request.args.get("start_year", type=int)
    end_year = request.args.get("end_year", type=int)

    data = df

    # University alias handling
    if university:
        data = data[data["university"] == university]

    # Degree filter
    if degree:
        data = data[data["degree"] == degree]

    # Year range filter
    if start_year:
        data = data[data["year"] >= start_year]
    if end_year:
        data = data[data["year"] <= end_year]

    if data.empty:
        return jsonify({
            "error": "No data found for the selected filters."
        }), 404

    result = {
        "filters": {
            "university": university,
            "degree": degree,
            "start_year": start_year,
            "end_year": end_year
        },
        "overall_employment_rate": round(
            data["employment_rate_overall"].mean(), 2
        ),
        "full_time_employment_rate": round(
            data["employment_rate_ft_perm"].mean(), 2
        )
    }

    return jsonify(result)


if __name__ == "__main__":
    app.run(debug=True)
