import pandas as pd
import seaborn as sns
import matplotlib.pyplot as plt

def retrieve_cleaned_data(csv_path: str) -> pd.DataFrame:
    df = pd.read_csv(csv_path)

    df['employment_rate_overall'] = df['employment_rate_overall'].str.replace('%', '')
    df['employment_rate_overall'] = pd.to_numeric(df['employment_rate_overall'], errors='coerce',downcast='float')

    df['employment_rate_ft_perm'] = df['employment_rate_ft_perm'].str.replace('%', '')
    df['employment_rate_ft_perm'] = pd.to_numeric(df['employment_rate_ft_perm'], errors='coerce',downcast='float')

    df['basic_monthly_mean'] = pd.to_numeric(df['basic_monthly_mean'], errors='coerce',downcast='integer')
    df['basic_monthly_median'] = pd.to_numeric(df['basic_monthly_median'], errors='coerce',downcast='integer')
    df['gross_monthly_mean'] = pd.to_numeric(df['gross_monthly_mean'], errors='coerce',downcast='integer')
    df['gross_monthly_median'] = pd.to_numeric(df['gross_monthly_median'], errors='coerce',downcast='integer')
    df['gross_mthly_25_percentile'] = pd.to_numeric(df['gross_mthly_25_percentile'], errors='coerce',downcast='integer')
    df['gross_mthly_75_percentile'] = pd.to_numeric(df['gross_mthly_75_percentile'], errors='coerce',downcast='integer')

    return df.dropna().reset_index(drop=True)

def get_all_graphs(target_statistic: str, start_year: int|None = None, end_year: int|None = None, university: list[str] = [], school: list[str] = [], degree: list[str] = []):
    df = retrieve_cleaned_data('data/GraduateEmploymentSurvey.csv')

    filtered_df = df
    split_category = "university"
    if start_year is not None and end_year is not None:
        filtered_df = df[df['year'].between(start_year, end_year)]

    if university != []:
        filtered_df = df[df['university'].isin(university)]
        split_category = "university"
    if school != []:
        filtered_df = df[df['school'].isin(school)]
        split_category = "school"
    if degree != []:
        filtered_df = df[df['degree'].isin(degree)]
        split_category = "degree"

    gen_trend_graph(filtered_df, target_statistic, split_category)
    gen_bar_graph(filtered_df, target_statistic, split_category)
    gen_box_and_whisker_graph(filtered_df, target_statistic, split_category)

def gen_trend_graph(df: pd.DataFrame, target_statistic: str, split_category:str):
    plt.figure(figsize=(13, 6))
    sns.lineplot(data=df, x='year', y=target_statistic, hue=split_category, marker='o', errorbar=None)

    plt.xticks(df['year'].unique())
    plt.show()

def gen_bar_graph(df: pd.DataFrame, target_statistic: str, split_category:str):
    plt.figure(figsize=(13, 6))
    sns.barplot(data=df, x=target_statistic, y=split_category, hue=split_category, errorbar=None)

    plt.show()

def gen_box_and_whisker_graph(df: pd.DataFrame, target_statistic: str, split_category:str):
    calculated_df = df.groupby(split_category)[['gross_monthly_median', 'gross_mthly_25_percentile', 'gross_mthly_75_percentile']].mean().reset_index()

    box_data = []
    for index, row in calculated_df.iterrows():
        # Calculate IQR (Interquartile Range) for whiskers
        # (Since your CSV doesn't have min/max columns, we estimate them standardly)
        q1 = row['gross_mthly_25_percentile']
        q3 = row['gross_mthly_75_percentile']
        iqr = q3 - q1
        
        # Create the dictionary for this specific university
        stats = {
            'label': row[split_category],  # Name on X-axis
            'med': row['gross_monthly_median'],
            'q1': q1,
            'q3': q3,
            'whislo': q1 - (1.25 * iqr), # Standard bottom whisker
            'whishi': q3 + (1.25 * iqr)  # Standard top whisker
        }
        box_data.append(stats)

    # 3. Draw the Plot
    fig, ax = plt.subplots(figsize=(13, 6))

    # The magic function that takes pre-calculated stats
    ax.bxp(box_data, vert=False, showfliers=False) # showfliers=False turns off outlier dots

    plt.title('Salary Distribution (Generated from Pre-calculated Stats)')
    plt.grid(axis='x', linestyle='-')
    plt.show()
