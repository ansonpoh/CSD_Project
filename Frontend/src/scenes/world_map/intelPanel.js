import { dailyQuestService } from '../../services/dailyQuests.js';
import { mapDiscoveryService } from '../../services/mapDiscovery.js';
import { WORLD_MAP_PALETTE as P } from './constants.js';

export const worldMapIntelPanelMethods = {
  populateIntelPanel(panel, learner) {
    this.clearPanelBody(panel);

    const c = this.createScrollableBody(panel, { left: 0, right: 0, top: 0, bottom: 24 });
    const pad = panel.pad;
    const textWidth = panel.width - pad * 2;
    const map = this.selectedMap;

    if (!map) {
      c.add(this.add.text(pad, 18, 'No map selected.', {
        fontSize: '16px',
        color: P.textMain,
        stroke: '#060814',
        strokeThickness: 4
      }));
      this.setPanelScrollMetrics(panel, 80);
      return;
    }

    const lines = [
      { label: 'Creator', value: `${map.creatorName} [${map.creatorBadge}]` },
      { label: 'Topic', value: map.recommendedTopic },
      { label: 'Unlock', value: map.unlockText }
    ];
    const dailySnapshot = dailyQuestService.getSnapshot();

    let y = 18;
    c.add(this.add.text(pad, y, map.name, {
      fontSize: '22px',
      fontStyle: 'bold',
      color: P.textMain,
      stroke: '#060814',
      strokeThickness: 5
    }));
    y += 30;

    lines.forEach(({ label, value }) => {
      c.add(this.add.text(pad, y, `${label}:`, {
        fontSize: '13px',
        color: P.textSub,
        fontStyle: 'bold',
        stroke: '#060814',
        strokeThickness: 4
      }));
      c.add(this.add.text(panel.width - pad, y, String(value), {
        fontSize: '13px',
        color: P.textMain,
        stroke: '#060814',
        strokeThickness: 4
      }).setOrigin(1, 0));
      y += 26;
    });

    y += 6;
    c.add(this.add.text(pad, y, 'Map promise', {
      fontSize: '14px',
      color: P.gold,
      fontStyle: 'bold',
      stroke: '#060814',
      strokeThickness: 4
    }));
    y += 24;

    const promiseText = this.add.text(pad, y, this.truncate(map.learningGoal, 118), {
      fontSize: '13px',
      color: P.textMain,
      stroke: '#060814',
      strokeThickness: 3,
      wordWrap: { width: textWidth }
    });
    c.add(promiseText);
    y += promiseText.height + 14;

    const recommendations = mapDiscoveryService.getRecommendations(this.catalog, learner).slice(0, 2);
    if (recommendations.length) {
      c.add(this.add.text(pad, y, 'Run guidance', {
        fontSize: '14px',
        color: P.good,
        fontStyle: 'bold',
        stroke: '#060814',
        strokeThickness: 4
      }));
      y += 22;

      recommendations.forEach((line, index) => {
        c.add(this.add.text(pad, y, `${index + 1}. ${this.truncate(line, 62)}`, {
          fontSize: '12px',
          color: P.textMain,
          stroke: '#060814',
          strokeThickness: 3
        }));
        y += 24;
      });
    }

    y += 8;
    const questLines = dailySnapshot.quests.map((quest) => {
      const marker = quest.completed ? '[x]' : '[ ]';
      return `${marker} ${quest.label} (${Math.min(quest.progress, quest.goal)}/${quest.goal})`;
    });

    const questsText = this.add.text(pad, y, `Daily Quests\n${questLines.join('\n')}`, {
      fontSize: '12px',
      color: P.textMain,
      stroke: '#060814',
      strokeThickness: 3,
      wordWrap: { width: textWidth }
    });
    c.add(questsText);
    y += questsText.height + 14;

    this.setPanelScrollMetrics(panel, y);
  }
};

