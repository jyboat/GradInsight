"use strict";

const API_BASE = "http://127.0.0.1:5000";
let chart;
let minYear, maxYear;

const universitySelect = document.getElementById("universitySelect");
const degreeSelect = document.getElementById("degreeSelect");
const startYear = document.getElementById("startYear");
const endYear = document.getElementById("endYear");
const result = document.getElementById("result");

const salaryYearInput = document.getElementById("salaryYear");
const salaryCompareType = document.getElementById("salaryCompareType");
const salaryItemsBox = document.getElementById("salaryItemsBox");
const salarySearch = document.getElementById("salarySearch");
const salaryResult = document.getElementById("salaryResult");

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

    const salaryYear = document.getElementById("salaryYear");
    salaryYear.min = minYear;
    salaryYear.max = maxYear;
    salaryYear.value = maxYear;

    fillSalaryItems("university", universities, degrees);
    salaryCompareType.addEventListener("change", () => {
        fillSalaryItems(salaryCompareType.value, universities, degrees);
    });
}

function fillSalaryItems(type, universities, degrees) {
  const list = (type === "university") ? universities : degrees;
  salaryItemsBox.innerHTML = list.map(item => `
    <label style="display:block; margin: 4px 0;">
      <input type="checkbox" value="${item}">
      ${item}
    </label>
  `).join("");

  if (salarySearch) {
    salarySearch.value = "";
    salarySearch.oninput = () => {
      const q = salarySearch.value.toLowerCase();
      Array.from(salaryItemsBox.querySelectorAll("label")).forEach(label => {
        label.style.display = label.textContent.toLowerCase().includes(q) ? "block" : "none";
      });
    };
  }
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

function showSection(name) {
  document.getElementById("section-employment").style.display = (name === "employment") ? "block" : "none";
  document.getElementById("section-salary").style.display = (name === "salary") ? "block" : "none";
  document.getElementById("section-trends").style.display = (name === "trends") ? "block" : "none";
}

let salaryChart, trendChart;

async function runSalaryComparison() {
  salaryResult.innerHTML = "";
  if (salaryChart) {
    salaryChart.destroy();
    salaryChart = null;
  }

  const year = salaryYearInput.value || maxYear;
  const type = salaryCompareType.value;
  const selected = Array.from(
    salaryItemsBox.querySelectorAll("input[type=checkbox]:checked")
  ).map(cb => cb.value);

  const params = new URLSearchParams();
  params.append("year", year);
  params.append("group_by", type);

  if (type === "university") selected.forEach(u => params.append("universities", u));
  if (type === "degree") selected.forEach(d => params.append("degrees", d));

  const res = await fetch(`${API_BASE}/analytics/salary-comparison?${params.toString()}`);
  const data = await res.json();

  if (data.error) {
    salaryResult.innerText = data.error;
    return;
  }

   const prettyType = (type === "university") ? "Universities" : "Degrees";
   const itemsText = selected.length ? selected.join(", ") : "Top 5";

   salaryResult.innerHTML = `
    <p><strong>Filters Applied</strong></p>
    <ul>
        <li>Year: ${year}</li>
        <li>Compare Type: ${prettyType}</li>
        <li>Selected: ${itemsText}</li>
    </ul>
    `;

    const avgMedian = average(data.median);
    const avgMean = average(data.mean);

    salaryResult.innerHTML += `
    <p><strong>Average Median Salary:</strong> ${avgMedian ? formatCurrency(avgMedian) : "N/A"}</p>
    <p><strong>Average Mean Salary:</strong> ${avgMean ? formatCurrency(avgMean) : "N/A"}</p>
    `;

  const ctx = document.getElementById("salaryChart").getContext("2d");
  if (salaryChart) salaryChart.destroy();

  salaryChart = new Chart(ctx, {
    type: "bar",
    data: {
      labels: data.labels,
      datasets: [
        { label: "Median Salary", data: data.median, borderWidth: 1 },
        { label: "Mean Salary", data: data.mean, borderWidth: 1 }
      ]
    },
    options: { responsive: true }
  });
}

async function runTrends() {
  const metric = document.getElementById("trendMetric").value;

  const res = await fetch(`${API_BASE}/analytics/trends?metric=${metric}`);
  const data = await res.json();

  if (data.error) {
    document.getElementById("trendResult").innerText = data.error;
    return;
  }

  document.getElementById("trendResult").innerHTML =
    `<p><strong>Metric:</strong> ${metric}</p>`;

  const ctx = document.getElementById("trendChart").getContext("2d");
  if (trendChart) trendChart.destroy();

  trendChart = new Chart(ctx, {
    type: "line",
    data: {
      labels: data.years,
      datasets: [{ label: "Value", data: data.values, borderWidth: 2, spanGaps: true }]
    },
    options: { responsive: true }
  });
}

function selectAllSalary() {
  Array.from(salaryItemsBox.querySelectorAll("input[type=checkbox]"))
    .forEach(cb => cb.checked = true);
}

function clearSalary() {
  Array.from(salaryItemsBox.querySelectorAll("input[type=checkbox]"))
    .forEach(cb => cb.checked = false);
}

function average(arr) {
  const nums = arr.filter(v => typeof v === "number");
  if (!nums.length) return null;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

function formatCurrency(val) {
  return `$${Math.round(val).toLocaleString()}`;
}

// ----------------------------
// Init
// ----------------------------
document.addEventListener("DOMContentLoaded", () => {
  loadMetadata();

  startYear.addEventListener("change", e => endYear.min = e.target.value);
  endYear.addEventListener("change", e => startYear.max = e.target.value);
});