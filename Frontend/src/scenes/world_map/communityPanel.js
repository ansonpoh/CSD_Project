import { mapDiscoveryService } from '../../services/mapDiscovery.js';
import { WORLD_MAP_PALETTE as P } from './constants.js';

export const worldMapCommunityPanelMethods = {
  populateCommunityPanel(panel) {
    this.clearPanelBody(panel);

    const c = this.createScrollableBody(panel, { left: 0, right: 0, top: 0, bottom: 24 });
    const pad = panel.pad;
    const textWidth = panel.width - pad * 2;
    const map = this.selectedMap;

    if (!map) {
      c.add(this.add.text(pad, 18, 'No community data available.', {
        fontSize: '16px',
        color: P.textMain,
        stroke: '#060814',
        strokeThickness: 4
      }));
      this.setPanelScrollMetrics(panel, 80);
      return;
    }

    const spotlight = mapDiscoveryService.getCreatorSpotlight(this.catalog);
    const trendLeader = [...this.catalog].sort((a, b) => b.socialProof.trendScore - a.socialProof.trendScore)[0];

    let y = 18;
    c.add(this.add.text(pad, y, `${map.socialProof.rating.toFixed(1)}\u2605 average from ${this.formatCompact(map.socialProof.ratingCount)} ratings`, {
      fontSize: '16px',
      color: P.gold,
      fontStyle: 'bold',
      stroke: '#060814',
      strokeThickness: 4
    }));
    y += 28;

    c.add(this.add.text(pad, y, `${this.formatCompact(map.socialProof.likes)} likes  |  ${this.formatCompact(map.socialProof.completions)} completions  |  ${map.socialProof.remixCount} remixes`, {
      fontSize: '13px',
      color: P.textMain,
      stroke: '#060814',
      strokeThickness: 3
    }));
    y += 26;

    c.add(this.add.text(pad, y, `Creator rep ${this.formatCompact(map.socialProof.creatorRep)}  |  trend ${this.formatCompact(map.socialProof.trendScore)}  |  your clears ${map.playerState.completions}`, {
      fontSize: '13px',
      color: P.textDesc,
      stroke: '#060814',
      strokeThickness: 3
    }));
    y += 36;

    c.add(this.createButton(pad, y, 160, 42, map.playerState.liked ? 'Unlike Map' : 'Like Map', () => {
      void this.toggleSelectedMapLike(map);
    }));

    c.add(this.createButton(pad + 348, y, 180, 42, map.unlocked ? 'Enter Highlighted Gate' : map.unlockText, () => {
      if (map.unlocked) this.enterMap(map);
    }, !map.unlocked));
    y += 58;

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

    c.add(this.add.text(pad, y, 'Creator spotlight', {
      fontSize: '15px',
      color: P.good,
      fontStyle: 'bold',
      stroke: '#060814',
      strokeThickness: 4
    }));
    y += 28;

    spotlight.forEach((entry, index) => {
      c.add(this.add.text(pad, y, `${index + 1}. ${entry.creatorName}  |  ${entry.name}`, {
        fontSize: '13px',
        color: P.textMain,
        stroke: '#060814',
        strokeThickness: 3
      }));

      c.add(this.add.text(panel.width - pad, y, `${this.formatCompact(entry.socialProof.creatorRep)} rep`, {
        fontSize: '13px',
        color: P.gold,
        stroke: '#060814',
        strokeThickness: 3
      }).setOrigin(1, 0));
      y += 26;
    });

    if (trendLeader) {
      y += 8;
      c.add(this.add.text(pad, y, 'Trending now', {
        fontSize: '15px',
        color: P.warn,
        fontStyle: 'bold',
        stroke: '#060814',
        strokeThickness: 4
      }));
      y += 24;

      const trendText = this.add.text(pad, y, `${trendLeader.name} is leading discovery this week with ${trendLeader.socialProof.likes} likes and ${trendLeader.socialProof.completions} clears.`, {
        fontSize: '13px',
        color: P.textMain,
        stroke: '#060814',
        strokeThickness: 3,
        wordWrap: { width: textWidth }
      });
      c.add(trendText);
      y += trendText.height + 12;
    }

    this.setPanelScrollMetrics(panel, y);
  }
};

