import { supabase } from "./supabaseClient.js";
import Chart from "chart.js/auto";
import "./style.css";

const TABLE = "vibration_events";
const MAX_EVENTS = 20;

// Cadangan label kalau kolom nama_status kosong
const STATUS_LABELS = {
  0: "Normal",
  1: "Getaran Ringan",
  2: "Getaran Sedang",
  3: "Getaran Kuat",
};

const el = {
  deviceId: document.getElementById("device-id"),
  connDot: document.getElementById("conn-dot"),
  connText: document.getElementById("conn-text"),
  hero: document.getElementById("hero"),
  statusText: document.getElementById("status-text"),
  magnitude: document.getElementById("magnitude-value"),
  lastUpdate: document.getElementById("last-update"),
  accelX: document.getElementById("accel-x"),
  accelY: document.getElementById("accel-y"),
  accelZ: document.getElementById("accel-z"),
  logBody: document.getElementById("log-body"),
  logCount: document.getElementById("log-count"),
};

let chart = null;

function setConnection(state) {
  el.connDot.className = "conn-dot conn-dot--" + state;
  el.connText.textContent =
    state === "live"
      ? "Live"
      : state === "error"
      ? "Gagal terhubung"
      : "Menghubungkan…";
}

function fmtNum(value, digits = 2) {
  if (value === null || value === undefined) return "--";
  return Number(value).toFixed(digits);
}

function fmtTime(iso) {
  return new Date(iso).toLocaleString("id-ID", {
    dateStyle: "medium",
    timeStyle: "medium",
  });
}

function statusLabel(row) {
  return row.nama_status || STATUS_LABELS[row.status] || `Status ${row.status}`;
}

function renderHero(latest) {
  if (!latest) return;
  el.hero.dataset.status = String(latest.status ?? 0);
  el.statusText.textContent = statusLabel(latest);
  el.magnitude.textContent = fmtNum(latest.magnitude);
  el.lastUpdate.textContent = `Update terakhir: ${fmtTime(latest.created_at)}`;
  el.accelX.textContent = fmtNum(latest.accel_x);
  el.accelY.textContent = fmtNum(latest.accel_y);
  el.accelZ.textContent = fmtNum(latest.accel_z);
  el.deviceId.textContent = latest.device_id || "--";
}

function renderTable(rows) {
  el.logCount.textContent = `${rows.length} event`;

  if (rows.length === 0) {
    el.logBody.innerHTML = `
      <tr class="log-table__empty-row">
        <td colspan="7">Menunggu data event pertama…</td>
      </tr>`;
    return;
  }

  el.logBody.innerHTML = rows
    .map((row) => {
      const s = row.status ?? 0;
      return `
        <tr>
          <td><span class="log-table__status-bar log-table__status-bar--${s}"></span></td>
          <td>${fmtTime(row.created_at)}</td>
          <td class="log-table__status-text--${s}">${statusLabel(row)}</td>
          <td>${fmtNum(row.magnitude)}</td>
          <td>${fmtNum(row.accel_x)}</td>
          <td>${fmtNum(row.accel_y)}</td>
          <td>${fmtNum(row.accel_z)}</td>
        </tr>`;
    })
    .join("");
}

function renderChart(rows) {
  const chronological = [...rows].reverse();
  const labels = chronological.map((r) =>
    new Date(r.created_at).toLocaleTimeString("id-ID")
  );
  const magnitudes = chronological.map((r) => r.magnitude ?? 0);

  if (!chart) {
    const ctx = document.getElementById("trace-chart").getContext("2d");
    chart = new Chart(ctx, {
      type: "line",
      data: {
        labels,
        datasets: [
          {
            label: "Magnitude (g)",
            data: magnitudes,
            borderColor: "#3fb98a",
            backgroundColor: "rgba(63, 185, 138, 0.08)",
            fill: true,
            tension: 0.25,
            pointRadius: 2,
          },
        ],
      },
      options: {
        responsive: true,
        plugins: { legend: { display: false } },
        scales: {
          x: {
            ticks: { color: "#7c8a96", font: { family: "JetBrains Mono", size: 10 } },
            grid: { color: "#2a3540" },
          },
          y: {
            ticks: { color: "#7c8a96", font: { family: "JetBrains Mono", size: 10 } },
            grid: { color: "#2a3540" },
          },
        },
      },
    });
  } else {
    chart.data.labels = labels;
    chart.data.datasets[0].data = magnitudes;
    chart.update();
  }
}

async function loadData() {
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .order("created_at", { ascending: false })
    .limit(MAX_EVENTS);

  if (error) {
    console.error("Gagal ambil data:", error.message);
    setConnection("error");
    el.connText.textContent = "Gagal ambil data: " + error.message;
    return;
  }

  setConnection("live");
  renderHero(data[0]);
  renderTable(data);
  renderChart(data);
}

loadData();

// Realtime: dashboard auto-update begitu ada event baru masuk
supabase
  .channel("vibration_events_changes")
  .on(
    "postgres_changes",
    { event: "INSERT", schema: "public", table: TABLE },
    () => loadData()
  )
  .subscribe();

// Refresh cadangan tiap 15 detik, jaga-jaga kalau realtime terputus
setInterval(loadData, 15000);
