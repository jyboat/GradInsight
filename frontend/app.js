"use strict";

const API_BASE = "http://127.0.0.1:5000";
let chart;
let minYear, maxYear;

// ----------------------------
// Load metadata
// ----------------------------
async function loadMetadata() {
    const universities = await fetch(`${API_BASE}/metadata/universities`).then(r => r.json());
    const degrees = await fetch(`${API_BASE}/metadata/degrees`).then(r => r.json());
    const years = await fetch(`${API_BASE}/metadata/years`).then(r => r.json());

    universities.forEach(u => {
        const opt = document.createElement("option");
        opt.value = u;
        opt.text = u;
        universitySelect.appendChild(opt);
    });

    degrees.forEach(d => {
        const opt = document.createElement("option");
        opt.value = d;
        opt.text = d;
        degreeSelect.appendChild(opt);
    });

    minYear = years.min;
    maxYear = years.max;

    startYear.min = minYear;
    startYear.max = maxYear;
    startYear.value = minYear;

    endYear.min = minYear;
    endYear.max = maxYear;
    endYear.value = maxYear;
}

// ----------------------------
// Run analytics
// ----------------------------
async function runAnalytics() {
    const university = universitySelect.value;
    const degree = degreeSelect.value;
    const start = startYear.value;
    const end = endYear.value;

    if (start && end && parseInt(start) > parseInt(end)) {
        result.innerText = "Start year cannot be later than end year.";
        return;
    }

    const params = new URLSearchParams();
    if (university) params.append("university", university);
    if (degree) params.append("degree", degree);
    if (start) params.append("start_year", start);
    if (end) params.append("end_year", end);

    const res = await fetch(`${API_BASE}/analytics/employment?${params}`);
    const data = await res.json();

    if (data.error) {
        result.innerText = data.error;
        return;
    }

    result.innerHTML = `
    <p><strong>Filters Applied</strong></p>
    <ul>
        <li>University: ${university || "All"}</li>
        <li>Degree: ${degree || "All"}</li>
        <li>Years: ${start} - ${end}</li>
    </ul>
    <p><strong>Overall Employment Rate:</strong> ${data.summary.overall_employment_rate ?? "N/A"}%</p>
    <p><strong>Full-Time Employment Rate:</strong> ${data.summary.full_time_employment_rate ?? "N/A"}%</p>
    `;

    renderChart(data.trend);
}

function resetFilters() {
    // Reset dropdowns
    universitySelect.value = "";
    degreeSelect.value = "";

    // Reset year inputs
    startYear.value = minYear;
    endYear.value = maxYear;
    startYear.max = maxYear;
    endYear.min = minYear;

    // Clear results
    result.innerHTML = "";

    // Clear chart
    if (chart) {
        chart.destroy();
        chart = null;
    }
}


// ----------------------------
// Render Chart
// ----------------------------
function renderChart(trend) {
    const ctx = document.getElementById("employmentChart").getContext("2d");

    if (chart) chart.destroy();

    chart = new Chart(ctx, {
        type: "line",
        data: {
            labels: trend.years,
            datasets: [
                {
                    label: "Overall Employment Rate",
                    data: trend.overall,
                    borderWidth: 2,
                    spanGaps: true
                },
                {
                    label: "Full-Time Employment Rate",
                    data: trend.full_time,
                    borderWidth: 2,
                    spanGaps: true
                }
            ]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100
                }
            }
        }
    });
}

// ----------------------------
// Init
// ----------------------------
document.addEventListener("DOMContentLoaded", () => {
  loadMetadata();

  startYear.addEventListener("change", e => endYear.min = e.target.value);
  endYear.addEventListener("change", e => startYear.max = e.target.value);
});