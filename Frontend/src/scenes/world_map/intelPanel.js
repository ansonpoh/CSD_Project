import { WORLD_MAP_PALETTE as P } from './constants.js';

export const worldMapIntelPanelMethods = {
  populateIntelPanel(panel, _learner) {
    const previousScrollOffset = panel?.scrollState?.offset ?? 0;
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
      this.setPanelScrollOffset(panel, previousScrollOffset);
      return;
    }

    const lines = [
      { label: 'Ratings', value: `${map.socialProof.rating.toFixed(1)} average from ${this.formatCompact(map.socialProof.ratingCount)}` },
      { label: 'Likes', value: this.formatCompact(map.socialProof.likes) },
      { label: 'Creator', value: `${map.creatorName} [${map.creatorBadge}]` },
      { label: 'Topic', value: map.recommendedTopic },
      { label: 'Unlock', value: map.unlockText }
    ];

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

    y += 6;
    c.add(this.createButton(pad, y, 160, 42, map.playerState.liked ? 'Unlike Map' : 'Like Map', () => {
      void this.toggleSelectedMapLike(map);
    }));
    y += 56;

    c.add(this.add.text(pad, y, `Your rating: ${map.playerState.rating || 0}\u2605`, {
      fontSize: '14px',
      color: P.textMain,
      fontStyle: 'bold',
      stroke: '#060814',
      strokeThickness: 4
    }));
    y += 28;

    [1, 2, 3, 4, 5].forEach((rating, index) => {
      c.add(this.createButton(pad + index * 72, y, 64, 38, `${rating}\u2605`, () => {
        void this.rateSelectedMap(map, rating);
      }, map.playerState.rating === rating));
    });
    y += 56;

    this.setPanelScrollMetrics(panel, y);
    this.setPanelScrollOffset(panel, previousScrollOffset);
  }
};

