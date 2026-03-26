import { apiService } from '../../services/api.js';
import { gameState } from '../../services/gameState.js';

const STYLES = `
  .quest-overlay {
    position: fixed;
    inset: 0;
    background: rgba(4, 8, 22, 0.82);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 9000;
    font-family: 'Georgia', serif;
  }
  .quest-panel {
    background: linear-gradient(160deg, #1a0f06 0%, #2e1a06 60%, #1a0f06 100%);
    border: 2px solid #c8870a;
    border-radius: 12px;
    width: 520px;
    max-width: 96vw;
    max-height: 86vh;
    overflow-y: auto;
    padding: 0;
    box-shadow: 0 0 40px rgba(200,135,10,0.25), 0 8px 32px rgba(0,0,0,0.7);
  }
  .quest-header {
    background: linear-gradient(90deg, #3b1f02, #5c2e04, #3b1f02);
    border-bottom: 1px solid #c8870a;
    border-radius: 10px 10px 0 0;
    padding: 18px 24px;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .quest-header h2 {
    margin: 0;
    font-size: 22px;
    color: #f4c048;
    letter-spacing: 1px;
    text-shadow: 0 0 12px rgba(244,192,72,0.4);
  }
  .quest-header p {
    margin: 4px 0 0;
    font-size: 12px;
    color: #b89060;
  }
  .quest-close {
    background: none;
    border: none;
    color: #b89060;
    font-size: 22px;
    cursor: pointer;
    padding: 4px 8px;
    line-height: 1;
  }
  .quest-close:hover { color: #f4c048; }
  .quest-body { padding: 20px 24px 24px; }
  .quest-card {
    background: rgba(255,255,255,0.04);
    border: 1px solid rgba(200,135,10,0.35);
    border-radius: 8px;
    padding: 16px;
    margin-bottom: 14px;
  }
  .quest-card-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 8px;
  }
  .quest-card-title {
    font-size: 15px;
    font-weight: bold;
    color: #f4e8c0;
  }
  .quest-type-badge {
    font-size: 10px;
    font-weight: bold;
    padding: 2px 8px;
    border-radius: 20px;
    letter-spacing: 0.5px;
    flex-shrink: 0;
    margin-left: 10px;
    margin-top: 2px;
  }
  .quest-type-observation { background: #1a3a5c; color: #7ec8f0; }
  .quest-type-interaction { background: #1a3a1a; color: #7ef0a0; }
  .quest-card-desc {
    font-size: 13px;
    color: #c8b890;
    line-height: 1.55;
    margin-bottom: 12px;
  }
  .quest-reward {
    font-size: 11px;
    color: #f4c048;
    margin-bottom: 12px;
  }
  .quest-reflect-btn {
    background: #3b2005;
    border: 1px solid #c8870a;
    color: #f4c048;
    padding: 7px 18px;
    border-radius: 6px;
    font-size: 13px;
    cursor: pointer;
    font-family: 'Georgia', serif;
  }
  .quest-reflect-btn:hover { background: #5c3208; }
  .quest-reflect-form { margin-top: 10px; }
  .quest-textarea {
    width: 100%;
    min-height: 90px;
    padding: 10px;
    background: rgba(0,0,0,0.5);
    border: 1px solid rgba(200,135,10,0.5);
    border-radius: 6px;
    color: #f4e8c0;
    font-size: 13px;
    font-family: 'Georgia', serif;
    resize: vertical;
    box-sizing: border-box;
    margin-bottom: 8px;
  }
  .quest-textarea::placeholder { color: #7a6040; }
  .quest-submit-btn {
    background: #1a4a1a;
    border: 1px solid #4ade80;
    color: #4ade80;
    padding: 7px 18px;
    border-radius: 6px;
    font-size: 13px;
    cursor: pointer;
    font-family: 'Georgia', serif;
  }
  .quest-submit-btn:hover { background: #225522; }
  .quest-submit-btn:disabled { opacity: 0.5; cursor: not-allowed; }
  .quest-result {
    padding: 10px 14px;
    border-radius: 6px;
    font-size: 13px;
    margin-top: 8px;
  }
  .quest-result--approved { background: #0e3020; border: 1px solid #4ade80; color: #4ade80; }
  .quest-result--pending  { background: #2a2000; border: 1px solid #f4c048; color: #f4c048; }
  .quest-result--rejected { background: #3a0e0e; border: 1px solid #ff8080; color: #ff8080; }
  .quest-empty {
    text-align: center;
    color: #7a6040;
    font-size: 14px;
    padding: 32px 0;
  }
  .quest-loading {
    text-align: center;
    color: #b89060;
    font-size: 14px;
    padding: 32px 0;
  }
`;

function ensureStyles() {
  if (!document.getElementById('quest-modal-styles')) {
    const tag = document.createElement('style');
    tag.id = 'quest-modal-styles';
    tag.textContent = STYLES;
    document.head.appendChild(tag);
  }
}

export function showQuests(scene) {
  ensureStyles();

  const overlay = document.createElement('div');
  overlay.className = 'quest-overlay';
  overlay.innerHTML = `
    <div class="quest-panel">
      <div class="quest-header">
        <div>
          <h2>Daily Quests</h2>
          <p>Observe and interact — reflect on the world around you</p>
        </div>
        <button class="quest-close" id="quest-close-btn">&#x2715;</button>
      </div>
      <div class="quest-body" id="quest-body">
        <div class="quest-loading">Loading your missions...</div>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  // State per mission card
  const cardState = {};

  function close() {
    overlay.remove();
    scene.input.enabled = true;
  }

  overlay.querySelector('#quest-close-btn').addEventListener('click', close);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });

  // Disable Phaser input while modal is open
  scene.input.enabled = false;

  function renderMissions(missions) {
    const body = overlay.querySelector('#quest-body');
    if (!missions.length) {
      body.innerHTML = `
        <div class="quest-empty">
          <p>You have completed all missions for today.</p>
          <p style="margin-top:8px;font-size:12px;">Come back tomorrow for new ones!</p>
        </div>`;
      return;
    }

    body.innerHTML = missions.map((m) => {
      const id = m.mission?.missionId || m.missionId;
      const title = m.mission?.title || m.title || 'Mission';
      const desc = m.mission?.description || m.description || '';
      const type = (m.mission?.type || m.type || 'OBSERVATION').toLowerCase();
      const xp = m.mission?.rewardXp ?? m.rewardXp ?? 50;
      const gold = m.mission?.rewardGold ?? m.rewardGold ?? 20;

      return `
        <div class="quest-card" data-mission-id="${id}">
          <div class="quest-card-header">
            <div class="quest-card-title">${title}</div>
            <span class="quest-type-badge quest-type-${type}">${type.toUpperCase()}</span>
          </div>
          <div class="quest-card-desc">${desc}</div>
          <div class="quest-reward">Reward: +${xp} XP &nbsp;·&nbsp; +${gold} Gold</div>
          <button class="quest-reflect-btn" data-action="open-reflect" data-mission-id="${id}">
            Write Reflection
          </button>
          <div class="quest-reflect-form" data-reflect-form="${id}" style="display:none;">
            <textarea class="quest-textarea" data-textarea="${id}" placeholder="Describe what you observed or experienced..."></textarea>
            <button class="quest-submit-btn" data-action="submit-reflect" data-mission-id="${id}">Submit</button>
          </div>
          <div class="quest-result" data-result="${id}" style="display:none;"></div>
        </div>
      `;
    }).join('');

    // Prevent Phaser from swallowing keystrokes inside textareas
    body.querySelectorAll('textarea').forEach((ta) => {
      ta.addEventListener('keydown', (e) => e.stopPropagation());
      ta.addEventListener('keyup', (e) => e.stopPropagation());
    });

    // Wire up open-reflect buttons
    body.querySelectorAll('[data-action="open-reflect"]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const missionId = btn.dataset.missionId;
        const form = body.querySelector(`[data-reflect-form="${missionId}"]`);
        if (form) {
          form.style.display = form.style.display === 'none' ? 'block' : 'none';
        }
      });
    });

    // Wire up submit buttons
    body.querySelectorAll('[data-action="submit-reflect"]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const missionId = btn.dataset.missionId;
        const textarea = body.querySelector(`[data-textarea="${missionId}"]`);
        const resultEl = body.querySelector(`[data-result="${missionId}"]`);
        const reflection = textarea?.value?.trim() || '';

        if (!reflection) {
          textarea?.focus();
          return;
        }

        if (cardState[missionId]?.submitting) return;
        cardState[missionId] = { submitting: true };

        btn.disabled = true;
        btn.textContent = 'Submitting...';

        try {
          const attempt = await apiService.submitReflection(missionId, reflection);
          const status = attempt?.status || 'PENDING';

          if (resultEl) {
            resultEl.style.display = 'block';
            if (status === 'APPROVED') {
              resultEl.className = 'quest-result quest-result--approved';
              resultEl.textContent = `Reflection accepted! +${attempt?.mission?.rewardXp ?? 50} XP and +${attempt?.mission?.rewardGold ?? 20} Gold awarded.`;
              // Refresh learner so HUD XP updates immediately
              apiService.getCurrentLearner().then((learner) => {
                if (learner) gameState.setLearner(learner);
              }).catch(() => {});
            } else if (status === 'FLAGGED_FOR_REVIEW') {
              resultEl.className = 'quest-result quest-result--pending';
              resultEl.textContent = 'Your reflection has been submitted and is under review. Rewards will be granted once approved.';
            } else {
              resultEl.className = 'quest-result quest-result--rejected';
              resultEl.textContent = 'Reflection was not accepted. Make sure it relates to the mission.';
            }
          }

          // Hide the form after submission
          const form = body.querySelector(`[data-reflect-form="${missionId}"]`);
          if (form) form.style.display = 'none';

          const reflectBtn = body.querySelector(`[data-action="open-reflect"][data-mission-id="${missionId}"]`);
          if (reflectBtn) reflectBtn.style.display = 'none';

        } catch (err) {
          btn.disabled = false;
          btn.textContent = 'Submit';
          if (resultEl) {
            resultEl.style.display = 'block';
            resultEl.className = 'quest-result quest-result--rejected';
            resultEl.textContent = 'Something went wrong. Please try again.';
          }
          cardState[missionId] = { submitting: false };
        }
      });
    });
  }

  // Load missions
  apiService.getDailyMissions()
    .then((missions) => renderMissions(Array.isArray(missions) ? missions : []))
    .catch(() => {
      const body = overlay.querySelector('#quest-body');
      body.innerHTML = `<div class="quest-empty">Could not load missions. Try again later.</div>`;
    });
}
