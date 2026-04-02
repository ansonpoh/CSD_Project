import { apiService } from "../../services/api.js";

export async function showAnalyticsModal(learnerId) {
  const overlay = document.createElement("div");
  overlay.id = "analytics-modal-overlay";
  overlay.style.cssText =
    "position:fixed; inset:0; background:rgba(0,0,0,0.85); z-index:10000; display:flex; align-items:center; justify-content:center; padding: 24px; font-family: sans-serif; color: #fff;";

  const container = document.createElement("div");
  container.className = "dash-card";
  container.style.cssText =
    "width: 100%; max-width: 900px; max-height: 85vh; overflow-y: auto; background-color: #12080b; border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; padding: 24px; box-sizing: border-box;";
  container.innerHTML = `<h2 style="margin-top:0;">Learning Analytics</h2><p>Crunching your numbers...</p>`;

  overlay.appendChild(container);
  document.body.appendChild(overlay);

  try {
    const data = await apiService.getLearnerAnalytics(learnerId);

    container.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
                <h2 style="margin: 0; font-size: 24px; font-weight: bold;">Learning Analytics</h2>
                <button id="close-analytics-btn" style="background: transparent; border: 1px solid rgba(255,255,255,0.2); color: #fff; padding: 8px 16px; border-radius: 4px; cursor: pointer; transition: background 0.2s;">Close</button>
            </div>

            <div style="background: rgba(255,255,255,0.05); padding: 16px; border-radius: 8px; margin-bottom: 24px;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                    <span style="font-weight: bold; color: #eab308;">Level ${data.currentLevel || 1}</span>
                    <span style="color: #a1a1aa;">${data.currentExp || 0} / ${data.expToNextLevel || 100} EXP</span>
                </div>
                <div style="width: 100%; background: rgba(0,0,0,0.5); border-radius: 999px; height: 12px; overflow: hidden;">
                    <div style="height: 100%; width: ${Math.min(100, ((data.currentExp || 0) / (data.expToNextLevel || 100)) * 100)}%; background: linear-gradient(90deg, #3b82f6, #8b5cf6); border-radius: 999px;"></div>
                </div>
            </div>

            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 16px; margin-bottom: 24px;">
                <div style="background: rgba(255,255,255,0.05); padding: 16px; border-radius: 8px;">
                    <h3 style="margin: 0 0 12px 0; font-size: 16px; color: #a1a1aa;">Daily Streak <span style="font-size: 20px;">🔥</span></h3>
                    <div style="display: flex; justify-content: space-between;">
                        <div>
                            <div style="font-size: 32px; font-weight: bold; color: #f97316;">${data.currentStreak || 0}</div>
                            <div style="font-size: 12px; color: #a1a1aa;">Current (Days)</div>
                        </div>
                        <div style="text-align: right;">
                            <div style="font-size: 24px; font-weight: bold; color: #fff;">${data.longestStreak || 0}</div>
                            <div style="font-size: 12px; color: #a1a1aa;">Longest (Days)</div>
                        </div>
                    </div>
                </div>

                <div style="background: rgba(255,255,255,0.05); padding: 16px; border-radius: 8px;">
                    <h3 style="margin: 0 0 12px 0; font-size: 16px; color: #a1a1aa;">Topic Mastery 📚</h3>
                    <div style="display: flex; flex-direction: column; gap: 8px; font-size: 15px;">
                        <div style="display: flex; justify-content: space-between;"><span>Completed</span> <strong style="color: #4ade80;">${data.topicsCompleted || 0}</strong></div>
                        <div style="display: flex; justify-content: space-between;"><span>In Progress</span> <strong style="color: #fbbf24;">${data.topicsInProgress || 0}</strong></div>
                        <div style="display: flex; justify-content: space-between;"><span>Not Started</span> <strong style="color: #9ca3af;">${data.topicsNotStarted || 0}</strong></div>
                    </div>
                </div>

                <div style="background: rgba(255,255,255,0.05); padding: 16px; border-radius: 8px;">
                    <h3 style="margin: 0 0 12px 0; font-size: 16px; color: #a1a1aa;">Combat & Quizzes ⚔️</h3>
                    <div style="display: flex; flex-direction: column; gap: 8px; font-size: 15px;">
                        <div style="display: flex; justify-content: space-between;"><span>Quizzes Attempted</span> <strong>${data.quizzesAttempted || 0}</strong></div>
                        <div style="display: flex; justify-content: space-between;"><span>Average Score</span> <strong style="color: #60a5fa;">${data.averageQuizScore ? data.averageQuizScore.toFixed(1) + "%" : "0%"}</strong></div>
                        <div style="display: flex; justify-content: space-between;"><span>Bosses Defeated</span> <strong style="color: #f87171;">${data.bossCompletions || 0}</strong></div>
                    </div>
                </div>
            </div>

            <div style="background: rgba(255,255,255,0.05); padding: 16px; border-radius: 8px;">
                <h3 style="margin: 0 0 16px 0; font-size: 16px; color: #a1a1aa;">EXP Growth (Last 7 Days) 📈</h3>
                <div style="height: 180px; width: 100%; position: relative; padding-top: 20px; border-bottom: 1px solid rgba(255,255,255,0.2);">
                    ${renderExpChart(data.expHistory || [])}
                </div>
            </div>
        `;

    container.querySelector("#close-analytics-btn").onclick = () =>
      overlay.remove();
  } catch (error) {
    container.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
                <h2 style="margin: 0; font-size: 24px; font-weight: bold; color: #f87171;">Error Loading Analytics</h2>
                <button id="close-analytics-btn" style="background: transparent; border: 1px solid rgba(255,255,255,0.2); color: #fff; padding: 8px 16px; border-radius: 4px; cursor: pointer;">Close</button>
            </div>
            <p style="color: #a1a1aa;">We couldn't retrieve your learning statistics at this time.</p>
        `;
    container.querySelector("#close-analytics-btn").onclick = () =>
      overlay.remove();
  }
}

function renderExpChart(expHistory) {
  if (!expHistory || expHistory.length === 0) {
    return '<div style="width: 100%; text-align: center; color: #a1a1aa; padding-bottom: 20px;">No EXP data available for the past week.</div>';
  }

  // SVG Configuration dimensions
  const width = 800;
  const height = 160;
  const paddingX = 40;
  const paddingY = 30; // Padding for top values and bottom dates

  // Find the maximum Y value to scale the chart appropriately
  const maxExp = Math.max(...expHistory.map((entry) => entry.expGained), 50);

  // Calculate (X,Y) coordinates for each point
  const points = expHistory.map((entry, index) => {
    const x =
      (index / (expHistory.length - 1)) * (width - paddingX * 2) + paddingX;
    const y =
      height - paddingY - (entry.expGained / maxExp) * (height - paddingY * 2);
    return { x, y, ...entry };
  });

  // Generate formatted strings for SVG paths
  const polylinePoints = points.map((p) => `${p.x},${p.y}`).join(" ");
  // Area closes at the bottom left and right corners to form a polygon
  const areaPoints = `${points[0].x},${height - paddingY} ${polylinePoints} ${points[points.length - 1].x},${height - paddingY}`;

  // Generate points, data text, and X-axis labels
  const dataPointsAndLabels = points
    .map(
      (p) => `
        <circle cx="${p.x}" cy="${p.y}" r="4" fill="#60a5fa" />
        <text x="${p.x}" y="${p.y - 12}" fill="#fff" font-size="12" font-weight="bold" text-anchor="middle">${p.expGained}</text>
        <text x="${p.x}" y="${height - paddingY + 22}" fill="#a1a1aa" font-size="12" text-anchor="middle">${p.date}</text>
    `,
    )
    .join("");

  return `
        <div style="width: 100%; height: 100%;">
            <svg viewBox="0 0 ${width} ${height}" style="width: 100%; height: 100%; overflow: visible;" preserveAspectRatio="none">
                <defs>
                    <linearGradient id="lineGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stop-color="#60a5fa" stop-opacity="0.4"/>
                        <stop offset="100%" stop-color="#60a5fa" stop-opacity="0.0"/>
                    </linearGradient>
                </defs>
                
                <line x1="${paddingX}" y1="${height - paddingY}" x2="${width - paddingX}" y2="${height - paddingY}" stroke="rgba(255,255,255,0.1)" stroke-width="2" />
                
                <polygon points="${areaPoints}" fill="url(#lineGradient)" />
                
                <polyline points="${polylinePoints}" fill="none" stroke="#60a5fa" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />
                
                ${dataPointsAndLabels}
            </svg>
        </div>
    `;
}
