import { apiService } from "../../services/api.js";

const STYLES = `
  .analytics-overlay {
    position: fixed;
    inset: 0;
    background: rgba(4, 8, 22, 0.82);
    z-index: 9000;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px;
    font-family: 'Georgia', serif;
  }
  .analytics-panel {
    width: min(940px, 96vw);
    max-height: 86vh;
    overflow-y: auto;
    background: linear-gradient(160deg, #060f2a 0%, #0d1e45 60%, #060f2a 100%);
    border: 2px solid #c8870a;
    border-radius: 12px;
    box-shadow: 0 0 40px rgba(200,135,10,0.25), 0 8px 32px rgba(0,0,0,0.7);
  }
  .analytics-header {
    background: linear-gradient(90deg, #0a1a3a, #142850, #0a1a3a);
    border-bottom: 1px solid #c8870a;
    border-radius: 10px 10px 0 0;
    padding: 16px 22px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }
  .analytics-title {
    margin: 0;
    font-size: 22px;
    color: #f4c048;
    letter-spacing: 0.8px;
    text-shadow: 0 0 12px rgba(244,192,72,0.4);
  }
  .analytics-close {
    background: none;
    border: none;
    color: #b89060;
    font-size: 24px;
    line-height: 1;
    cursor: pointer;
    padding: 4px 8px;
  }
  .analytics-close:hover { color: #f4c048; }
  .analytics-body {
    padding: 18px 22px 22px;
    color: #f4e8c0;
  }
  .analytics-state {
    margin-bottom: 16px;
    border-radius: 8px;
    border: 1px solid transparent;
    padding: 8px 12px;
    font-size: 12px;
    font-weight: bold;
    letter-spacing: 0.35px;
  }
  .analytics-state--loading { background: #1a2a4a; border-color: #4a6a9a; color: #a7c9f0; }
  .analytics-state--error { background: #3a0e0e; border-color: #8b2020; color: #ff9f9f; }
  .analytics-progress {
    background: rgba(255,255,255,0.04);
    border: 1px solid rgba(200,135,10,0.35);
    border-radius: 8px;
    padding: 14px;
    margin-bottom: 16px;
  }
  .analytics-progress-meta {
    display: flex;
    justify-content: space-between;
    margin-bottom: 8px;
    gap: 12px;
    font-size: 14px;
  }
  .analytics-level {
    color: #f4c048;
    font-weight: bold;
  }
  .analytics-exp {
    color: #a7c9f0;
  }
  .analytics-progress-track {
    width: 100%;
    background: rgba(0,0,0,0.45);
    border-radius: 999px;
    height: 12px;
    overflow: hidden;
    border: 1px solid rgba(200,135,10,0.2);
  }
  .analytics-progress-fill {
    height: 100%;
    background: linear-gradient(90deg, #3a7bd5, #4ade80);
    border-radius: 999px;
  }
  .analytics-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(230px, 1fr));
    gap: 14px;
    margin-bottom: 16px;
  }
  .analytics-card {
    background: rgba(255,255,255,0.04);
    border: 1px solid rgba(200,135,10,0.35);
    border-radius: 8px;
    padding: 14px;
  }
  .analytics-card h3 {
    margin: 0 0 12px;
    font-size: 15px;
    color: #a7c9f0;
    letter-spacing: 0.4px;
  }
  .analytics-row {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 8px;
    margin-bottom: 8px;
    font-size: 14px;
  }
  .analytics-row:last-child { margin-bottom: 0; }
  .analytics-kpi {
    font-size: 30px;
    font-weight: bold;
    color: #f97316;
  }
  .analytics-kpi-label {
    font-size: 12px;
    color: #a7c9f0;
    margin-top: 2px;
  }
  .analytics-kpi-right {
    text-align: right;
  }
  .analytics-kpi-right strong {
    font-size: 23px;
    color: #f4e8c0;
  }
  .analytics-value-success { color: #4ade80; font-weight: bold; }
  .analytics-value-warn { color: #f4c048; font-weight: bold; }
  .analytics-value-muted { color: #9ca3af; font-weight: bold; }
  .analytics-value-info { color: #60a5fa; font-weight: bold; }
  .analytics-value-danger { color: #f87171; font-weight: bold; }
  .analytics-chart-card {
    background: rgba(255,255,255,0.04);
    border: 1px solid rgba(200,135,10,0.35);
    border-radius: 8px;
    padding: 14px;
  }
  .analytics-chart-card h3 {
    margin: 0 0 14px;
    font-size: 15px;
    color: #a7c9f0;
    letter-spacing: 0.4px;
  }
  .analytics-chart-wrap {
    height: 190px;
    width: 100%;
    border-bottom: 1px solid rgba(200,135,10,0.28);
    padding-top: 20px;
  }
  .analytics-chart-empty {
    width: 100%;
    text-align: center;
    color: #7a6040;
    padding-top: 40px;
    font-size: 13px;
  }
`;

function ensureStyles() {
  if (!document.getElementById("analytics-modal-styles")) {
    const tag = document.createElement("style");
    tag.id = "analytics-modal-styles";
    tag.textContent = STYLES;
    document.head.appendChild(tag);
  }
}

export async function showAnalyticsModal(learnerId) {
  ensureStyles();

  const overlay = document.createElement("div");
  overlay.className = "analytics-overlay";
  overlay.id = "analytics-modal-overlay";

  const container = document.createElement("div");
  container.className = "analytics-panel";
  container.innerHTML = `
    <div class="analytics-header">
      <h2 class="analytics-title">Learning Analytics</h2>
      <button id="close-analytics-btn" class="analytics-close" aria-label="Close analytics modal">&#x2715;</button>
    </div>
    <div class="analytics-body">
      <div class="analytics-state analytics-state--loading">LOADING: Crunching your numbers...</div>
    </div>
  `;

  overlay.appendChild(container);
  document.body.appendChild(overlay);

  const close = () => {
    document.removeEventListener("keydown", handleEsc);
    overlay.remove();
  };
  const handleEsc = (event) => {
    if (event.key === "Escape") close();
  };

  document.addEventListener("keydown", handleEsc);
  overlay.addEventListener("click", (event) => {
    if (event.target === overlay) close();
  });
  container.querySelector("#close-analytics-btn")?.addEventListener("click", close);

  try {
    const data = await apiService.getLearnerAnalytics(learnerId);
    const expToNext = Math.max(1, Number(data.expToNextLevel || 100));
    const currentExp = Math.max(0, Number(data.currentExp || 0));
    const expPercent = Math.min(100, (currentExp / expToNext) * 100);

    container.querySelector(".analytics-body").innerHTML = `
      <div class="analytics-progress">
        <div class="analytics-progress-meta">
          <span class="analytics-level">Level ${data.currentLevel || 1}</span>
          <span class="analytics-exp">${currentExp} / ${expToNext} EXP</span>
        </div>
        <div class="analytics-progress-track">
          <div class="analytics-progress-fill" style="width:${expPercent}%;"></div>
        </div>
      </div>

      <div class="analytics-grid">
        <div class="analytics-card">
          <h3>Daily Streak</h3>
          <div class="analytics-row">
            <div>
              <div class="analytics-kpi">${data.currentStreak || 0}</div>
              <div class="analytics-kpi-label">Current (Days)</div>
            </div>
            <div class="analytics-kpi-right">
              <strong>${data.longestStreak || 0}</strong>
              <div class="analytics-kpi-label">Longest (Days)</div>
            </div>
          </div>
        </div>

        <div class="analytics-card">
          <h3>Topic Mastery</h3>
          <div class="analytics-row"><span>Completed</span><strong class="analytics-value-success">${data.topicsCompleted || 0}</strong></div>
          <div class="analytics-row"><span>In Progress</span><strong class="analytics-value-warn">${data.topicsInProgress || 0}</strong></div>
          <div class="analytics-row"><span>Not Started</span><strong class="analytics-value-muted">${data.topicsNotStarted || 0}</strong></div>
        </div>

        <div class="analytics-card">
          <h3>Combat and Quizzes</h3>
          <div class="analytics-row"><span>Quizzes Attempted</span><strong>${data.quizzesAttempted || 0}</strong></div>
          <div class="analytics-row"><span>Average Score</span><strong class="analytics-value-info">${data.averageQuizScore ? `${data.averageQuizScore.toFixed(1)}%` : "0%"}</strong></div>
          <div class="analytics-row"><span>Bosses Defeated</span><strong class="analytics-value-danger">${data.bossCompletions || 0}</strong></div>
        </div>
      </div>

      <div class="analytics-chart-card">
        <h3>EXP Growth (Last 7 Days)</h3>
        <div class="analytics-chart-wrap">
          ${renderExpChart(data.expHistory || [])}
        </div>
      </div>
    `;
  } catch (error) {
    container.querySelector(".analytics-body").innerHTML = `
      <div class="analytics-state analytics-state--error">ERROR: Could not load analytics right now.</div>
      <p>We could not retrieve your learning statistics at this time.</p>
    `;
  }
}

function renderExpChart(expHistory) {
  if (!expHistory || expHistory.length === 0) {
    return '<div class="analytics-chart-empty">No EXP data available for the past week.</div>';
  }

  const width = 800;
  const height = 160;
  const paddingX = 40;
  const paddingY = 30;

  const maxExp = Math.max(...expHistory.map((entry) => entry.expGained), 50);

  const points = expHistory.map((entry, index) => {
    const denominator = Math.max(1, expHistory.length - 1);
    const x =
      (index / denominator) * (width - paddingX * 2) + paddingX;
    const y =
      height - paddingY - (entry.expGained / maxExp) * (height - paddingY * 2);
    return { x, y, ...entry };
  });

  const polylinePoints = points.map((p) => `${p.x},${p.y}`).join(" ");
  const areaPoints = `${points[0].x},${height - paddingY} ${polylinePoints} ${points[points.length - 1].x},${height - paddingY}`;

  const dataPointsAndLabels = points
    .map(
      (p) => `
        <circle cx="${p.x}" cy="${p.y}" r="4" fill="#60a5fa" />
        <text x="${p.x}" y="${p.y - 12}" fill="#f4e8c0" font-size="12" font-weight="bold" text-anchor="middle">${p.expGained}</text>
        <text x="${p.x}" y="${height - paddingY + 22}" fill="#a7c9f0" font-size="12" text-anchor="middle">${p.date}</text>
    `,
    )
    .join("");

  return `
        <div style="width: 100%; height: 100%;">
            <svg viewBox="0 0 ${width} ${height}" style="width: 100%; height: 100%; overflow: visible;" preserveAspectRatio="none">
                <defs>
                    <linearGradient id="lineGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stop-color="#60a5fa" stop-opacity="0.45"/>
                        <stop offset="100%" stop-color="#60a5fa" stop-opacity="0.05"/>
                    </linearGradient>
                </defs>

                <line x1="${paddingX}" y1="${height - paddingY}" x2="${width - paddingX}" y2="${height - paddingY}" stroke="rgba(200,135,10,0.26)" stroke-width="2" />

                <polygon points="${areaPoints}" fill="url(#lineGradient)" />

                <polyline points="${polylinePoints}" fill="none" stroke="#60a5fa" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />

                ${dataPointsAndLabels}
            </svg>
        </div>
    `;
}
