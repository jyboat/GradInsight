from flask import Flask, request, jsonify
import pandas as pd
from flask_cors import CORS

import pandas as pd
from prophet import Prophet
from pandas.tseries.offsets import YearEnd
from datetime import datetime

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
# Analytics Funciton 1: Employment Analytics
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

    data = df.copy()

    # Apply filters (multi-select)
    data = data[data["university"].isin(universities)]
    data = data[data["degree"].isin(degrees)]
    data = data[(data["year"] >= start_year) & (data["year"] <= end_year)]

    if data.empty:
        return jsonify({"error": "No data found for the selected filters."}), 404
    
    if enable_prediction:
        data = get_predictions(data, numeric_columns)
    else: 
        data['data_source'] = 'actual'

    latest_year = int(data['year'].unique().max())
    full_years = list(range(start_year, latest_year + 1))

    # Build complete grid: (university, degree) x year
    course_keys = data[["university", "degree"]].drop_duplicates()

    grid_rows = []
    for _, row in course_keys.iterrows():
        for y in full_years:
            grid_rows.append({"university": row["university"], "degree": row["degree"], "year": y})
    grid_df = pd.DataFrame(grid_rows)

    # Aggregate actual data
    agg_df = (
        data.groupby(["university", "degree", "year"], as_index=False)
        .agg({
            "employment_rate_overall": "mean",
            "employment_rate_ft_perm": "mean",
            "data_source": "first" # This keeps the 'actual' or 'predicted' string
        })
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
    start_year = request.args.get("start_year", type=int)
    end_year = request.args.get("end_year", type=int)

    group_by = request.args.get("group_by", default="university")
    selected_universities = request.args.getlist("universities")
    selected_degrees = request.args.getlist("degrees")

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

    data = df.copy()

    # Filter by year range
    data = data[(data["year"] >= start_year) & (data["year"] <= end_year)]

    # Apply selection filters
    if group_by == "university" and selected_universities:
        data = data[data["university"].isin(selected_universities)]

    if group_by == "degree" and selected_degrees:
        data = data[data["degree"].isin(selected_degrees)]

    data = data.dropna(subset=["gross_monthly_mean", "gross_monthly_median"])

    if data.empty:
        return jsonify({"error": "No salary data found for the selected filters."}), 404

    # Decide which items to include (Top 5 default)
    selection_was_empty = (
        (group_by == "university" and not selected_universities) or
        (group_by == "degree" and not selected_degrees)
    )

    # Compute Top 5
    items = None
    if selection_was_empty:
        snapshot = data[data["year"] == end_year]
        if snapshot.empty:
            # fallback: use overall across range if end_year has no rows
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
        # Use selected items
        if group_by == "university":
            items = selected_universities
        else:
            items = selected_degrees

    years = list(range(start_year, end_year + 1))

    # Aggregate per (item, year)
    grouped = (
        data.groupby([group_by, "year"])[["gross_monthly_mean", "gross_monthly_median"]]
        .mean()
        .reset_index()
    )

    series = []
    for item in items:
        item_df = grouped[grouped[group_by] == item]

        # map year to value
        mean_map = dict(zip(item_df["year"], item_df["gross_monthly_mean"]))
        median_map = dict(zip(item_df["year"], item_df["gross_monthly_median"]))

        mean_vals = [None if pd.isna(mean_map.get(y, None)) else float(mean_map.get(y)) for y in years]
        median_vals = [None if pd.isna(median_map.get(y, None)) else float(median_map.get(y)) for y in years]

        series.append({
            "label": item,
            "mean": mean_vals,
            "median": median_vals
        })

    return jsonify({
        "filters": {
            "group_by": group_by,
            "universities": selected_universities,
            "degrees": selected_degrees,
            "start_year": start_year,
            "end_year": end_year,
            "top5_default": selection_was_empty
        },
        "years": years,
        "series": series
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

def get_predictions(df, target_columns, degree_col='degree'):
    current_year = datetime.now().year
    unique_degrees = df[degree_col].unique()
    
    all_new_rows = []

    for degree in unique_degrees:
        # Get all rows for this degree to capture 'other' column values
        degree_df = df[df[degree_col] == degree].copy()
        
        # Identify "other" columns (excluding year, degree, and targets)
        other_cols = [c for c in df.columns if c not in target_columns and c != 'year' and c != degree_col]
        
        # Get the most recent values for the 'other' columns to carry forward
        last_known_metadata = degree_df.sort_values('year').iloc[-1][other_cols]

        # Dictionary to store predictions for this specific degree
        degree_predictions = {}

        for target in target_columns:
            temp_df = degree_df.groupby('year')[target].mean().reset_index()
            last_data_year = temp_df['year'].max()
            periods_to_forecast = max(0, current_year - last_data_year) 
            
            if len(temp_df) < 2 or periods_to_forecast == 0:
                continue

            temp_df.columns = ['ds', 'y']
            temp_df['ds'] = pd.to_datetime(temp_df['ds'], format='%Y') + YearEnd(0)

            model = Prophet(yearly_seasonality=False, changepoint_prior_scale=0.05)
            model.fit(temp_df)
            
            future = model.make_future_dataframe(periods=periods_to_forecast, freq='YE')
            forecast = model.predict(future)
            
            # Keep only the future years
            forecast['year'] = forecast['ds'].dt.year
            new_preds = forecast[forecast['year'] > last_data_year][['year', 'yhat']]
            degree_predictions[target] = new_preds

        # If we have predictions, merge them and add the 'other' columns
        if degree_predictions:
            # Combine multiple targets for this degree
            first_target = list(degree_predictions.keys())[0]
            combined_future = degree_predictions[first_target].rename(columns={'yhat': first_target})
            
            for target in list(degree_predictions.keys())[1:]:
                target_df = degree_predictions[target].rename(columns={'yhat': target})
                combined_future = pd.merge(combined_future, target_df, on='year', how='outer')

            # Add the degree column back
            combined_future[degree_col] = degree
            
            # Carry forward the 'other' metadata columns
            for col in other_cols:
                combined_future[col] = last_known_metadata[col]
            
            all_new_rows.append(combined_future)

    if not all_new_rows:
        return df

    # Combine everything
    final_predictions = pd.concat(all_new_rows, ignore_index=True)

    df['data_source'] = 'actual'
    final_predictions['data_source'] = 'predicted'

    return pd.concat([df, final_predictions], ignore_index=True).sort_values(['year', degree_col])

# ----------------------------
# Analytics Function 3: Trend Analysis Over Time
# ----------------------------
# @app.route("/analytics/trends")
# def trends():

if __name__ == "__main__":
    app.run(debug=True)
