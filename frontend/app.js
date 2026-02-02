"use strict";

const API_BASE = "http://127.0.0.1:5000";
let chart;
let minYear, maxYear;

const startYear = document.getElementById("startYear");
const endYear = document.getElementById("endYear");
const result = document.getElementById("result");

const salaryYearInput = document.getElementById("salaryYear");
const salaryCompareType = document.getElementById("salaryCompareType");
const salaryItemsBox = document.getElementById("salaryItemsBox");
const salarySearch = document.getElementById("salarySearch");
const salaryResult = document.getElementById("salaryResult");

const universityBox = document.getElementById("universityBox");
const degreeBox = document.getElementById("degreeBox");

const step2Content = document.getElementById("step2Content");
const step3Content = document.getElementById("step3Content");

let allData = [];   // raw dataset metadata
let uniToDegrees = {};

// ----------------------------
// Load metadata
// ----------------------------
async function loadMetadata() {
  const res = await fetch(`${API_BASE}/metadata/full`);
  allData = await res.json();

  // Build university → degree mapping
  uniToDegrees = {};
  allData.forEach(row => {
    if (!uniToDegrees[row.university]) {
      uniToDegrees[row.university] = new Set();
    }
    uniToDegrees[row.university].add(row.degree);
  });

  // Render university checkboxes
  renderUniversities();

  // Year inputs (unchanged)
  const years = await fetch(`${API_BASE}/metadata/years`).then(r => r.json());

  minYear = years.min;
  maxYear = years.max;

  startYear.min = minYear;
  startYear.max = maxYear;
  startYear.value = minYear;

  endYear.min = minYear;
  endYear.max = maxYear;
  endYear.value = maxYear;
}

function renderUniversities() {
  const universities = Object.keys(uniToDegrees).sort();
  universityBox.innerHTML = universities.map(u => `
    <label style="display:block">
      <input type="checkbox" value="${u}" onchange="onUniversityChange()">
      ${u}
    </label>
  `).join("");
}

function onUniversityChange() {
  const selectedUnis = getCheckedValues(universityBox);

  if (!selectedUnis.length) {
    // Reset downstream steps
    step2Content.style.display = "none";
    step3Content.style.display = "none";
    degreeBox.innerHTML = "";
    return;
  }

  // Show Step 2
  step2Content.style.display = "block";
  renderDegrees(selectedUnis);
}

function onDegreeChange() {
  const selectedDegrees = getCheckedValues(degreeBox);

  if (!selectedDegrees.length) {
    step3Content.style.display = "none";
    return;
  }

  // Show Step 3
  step3Content.style.display = "block";
}

function renderDegrees(selectedUnis) {
  const degrees = new Set();

  selectedUnis.forEach(u => {
    uniToDegrees[u]?.forEach(d => degrees.add(d));
  });

  degreeBox.innerHTML = Array.from(degrees).sort().map(d => `
    <label style="display:block">
      <input type="checkbox" value="${d}" onchange="onDegreeChange()">
      ${d}
    </label>
  `).join("");
}

function getCheckedValues(container) {
  return Array.from(
    container.querySelectorAll("input[type=checkbox]:checked")
  ).map(cb => cb.value);
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
  const universities = getCheckedValues(universityBox);
  const degrees = getCheckedValues(degreeBox);
  const start = startYear.value;
  const end = endYear.value;

  if (!universities.length) {
    result.innerText = "Please select at least one university.";
    return;
  }

  if (!degrees.length) {
    result.innerText = "Please select at least one course.";
    return;
  }

  if (parseInt(start) > parseInt(end)) {
    result.innerText = "Start year cannot be later than end year.";
    return;
  }

  const params = new URLSearchParams();
  universities.forEach(u => params.append("universities", u));
  degrees.forEach(d => params.append("degrees", d));
  params.append("start_year", start);
  params.append("end_year", end);

  const res = await fetch(`${API_BASE}/analytics/employment?${params}`);
  const data = await res.json();

  if (data.error) {
    result.innerText = data.error;
    return;
  }

  result.innerHTML = `
    <p><strong>Universities:</strong> ${universities.join(", ")}</p>
    <p><strong>Courses:</strong> ${degrees.join(", ")}</p>
    <p><strong>Years:</strong> ${start} – ${end}</p>
  `;

  renderEmploymentChart(data.series);
}

function resetFilters() {
  // Clear universities
  Array.from(universityBox.querySelectorAll("input[type=checkbox]"))
    .forEach(cb => cb.checked = false);

  // Hide steps 2 & 3
  step2Content.style.display = "none";
  step3Content.style.display = "none";

  // Clear degrees
  degreeBox.innerHTML = "";

  // Reset years
  startYear.value = minYear;
  endYear.value = maxYear;

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
function renderEmploymentChart(series) {
  const ctx = document.getElementById("employmentChart").getContext("2d");
  if (chart) chart.destroy();

  const datasets = series.map(s => ({
    label: `${s.degree} (${s.university})`,
    data: s.overall_employment_rate,
    spanGaps: false,
    borderWidth: 2
  }));

  chart = new Chart(ctx, {
    type: "line",
    data: {
      labels: series[0].years,
      datasets
    },
    options: {
      responsive: true,
      scales: {
        y: { beginAtZero: true, max: 100 }
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

// async function runTrends() {
//   const metric = document.getElementById("trendMetric").value;

//   const res = await fetch(`${API_BASE}/analytics/trends?metric=${metric}`);
//   const data = await res.json();

//   if (data.error) {
//     document.getElementById("trendResult").innerText = data.error;
//     return;
//   }

//   document.getElementById("trendResult").innerHTML =
//     `<p><strong>Metric:</strong> ${metric}</p>`;

//   const ctx = document.getElementById("trendChart").getContext("2d");
//   if (trendChart) trendChart.destroy();

//   trendChart = new Chart(ctx, {
//     type: "line",
//     data: {
//       labels: data.years,
//       datasets: [{ label: "Value", data: data.values, borderWidth: 2, spanGaps: true }]
//     },
//     options: { responsive: true }
//   });
// }

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

function selectAllUniversities() {
  const checkboxes = universityBox.querySelectorAll("input[type=checkbox]");
  checkboxes.forEach(cb => cb.checked = true);

  // Trigger step progression
  onUniversityChange();
}

function selectAllDegrees() {
  const checkboxes = degreeBox.querySelectorAll("input[type=checkbox]");
  checkboxes.forEach(cb => cb.checked = true);

  // Trigger step progression
  onDegreeChange();
}


// ----------------------------
// Init
// ----------------------------
document.addEventListener("DOMContentLoaded", () => {
  loadMetadata();

  startYear.addEventListener("change", e => endYear.min = e.target.value);
  endYear.addEventListener("change", e => startYear.max = e.target.value);
});