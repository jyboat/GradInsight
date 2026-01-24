from flask import Flask, request, jsonify
import pandas as pd

app = Flask(__name__)

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

UNIVERSITY_ALIASES = {
    "NUS": "National University of Singapore",
    "NTU": "Nanyang Technological University",
    "SMU": "Singapore Management University",
    "SIT": "Singapore Institute of Technology",
    "SUSS": "Singapore University of Social Sciences",
    "SUTD": "Singapore University of Technology and Design"
}

@app.route("/analytics/employment-rate")
def employment_rate():
    university = request.args.get("university")

    data = df
    if university:
        university_full = UNIVERSITY_ALIASES.get(university.upper(), university)
        data = data[data["university"] == university_full]

    if data.empty:
        return jsonify({
            "error": f"No data found for university: {university}"
        }), 404

    result = {
        "university": university,
        "avg_employment_rate": round(
            data["employment_rate_overall"].mean(), 2
        )
    }

    return jsonify(result)

if __name__ == "__main__":
    app.run(debug=True)
