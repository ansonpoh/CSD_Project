import { mapDiscoveryService } from '../../services/mapDiscovery.js';
import { WORLD_MAP_PALETTE as P } from './constants.js';

export const worldMapCommunityPanelMethods = {
  populateCommunityPanel(panel) {
    this.clearPanelBody(panel);

    const c = panel.body;
    const pad = panel.pad;
    const map = this.selectedMap;

    if (!map) {
      c.add(this.add.text(pad, 18, 'No community data available.', {
        fontSize: '16px',
        color: P.textMain,
        stroke: '#060814',
        strokeThickness: 4
      }));
      return;
    }

    const spotlight = mapDiscoveryService.getCreatorSpotlight(this.catalog);
    const trendLeader = [...this.catalog].sort((a, b) => b.socialProof.trendScore - a.socialProof.trendScore)[0];

    c.add(this.add.text(pad, 18, `${map.socialProof.rating.toFixed(1)}★ average from ${this.formatCompact(map.socialProof.ratingCount)} ratings`, {
      fontSize: '16px',
      color: P.gold,
      fontStyle: 'bold',
      stroke: '#060814',
      strokeThickness: 4
    }));

    c.add(this.add.text(pad, 46, `${this.formatCompact(map.socialProof.likes)} likes  |  ${this.formatCompact(map.socialProof.completions)} completions  |  ${map.socialProof.remixCount} remixes`, {
      fontSize: '13px',
      color: P.textMain,
      stroke: '#060814',
      strokeThickness: 3
    }));

    c.add(this.add.text(pad, 72, `Creator rep ${this.formatCompact(map.socialProof.creatorRep)}  |  trend ${this.formatCompact(map.socialProof.trendScore)}  |  your clears ${map.playerState.completions}`, {
      fontSize: '13px',
      color: P.textDesc,
      stroke: '#060814',
      strokeThickness: 3
    }));

    const btnY = 108;
    c.add(this.createButton(pad, btnY, 160, 42, map.playerState.liked ? 'Unlike Map' : 'Like Map', () => {
      mapDiscoveryService.toggleLike(map);
      this.scene.restart({ selectedMapId: map.mapId });
    }));

    c.add(this.createButton(pad + 174, btnY, 160, 42, map.playerState.rating >= 5 ? 'Rated 5★' : 'Rate 5★', () => {
      mapDiscoveryService.rateMap(map, 5);
      this.scene.restart({ selectedMapId: map.mapId });
    }));

    c.add(this.createButton(pad + 348, btnY, 180, 42, map.unlocked ? 'Enter Highlighted Gate' : map.unlockText, () => {
      if (map.unlocked) this.enterMap(map);
    }, !map.unlocked));

    c.add(this.add.text(pad, 166, 'Creator spotlight', {
      fontSize: '15px',
      color: P.good,
      fontStyle: 'bold',
      stroke: '#060814',
      strokeThickness: 4
    }));

    let y = 194;
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

    if (!trendLeader) return;

    y += 8;
    c.add(this.add.text(pad, y, 'Trending now', {
      fontSize: '15px',
      color: P.warn,
      fontStyle: 'bold',
      stroke: '#060814',
      strokeThickness: 4
    }));
    y += 24;

    c.add(this.add.text(pad, y, `${trendLeader.name} is leading discovery this week with ${trendLeader.socialProof.likes} likes and ${trendLeader.socialProof.completions} clears.`, {
      fontSize: '13px',
      color: P.textMain,
      stroke: '#060814',
      strokeThickness: 3,
      wordWrap: { width: panel.width - pad * 2 }
    }));
  }
};
