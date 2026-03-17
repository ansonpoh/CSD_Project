import Phaser from 'phaser';
import { soldier } from '../../characters/soldier/Soldier.js';
import { gameState } from '../../services/gameState.js';
import { mapDiscoveryService } from '../../services/mapDiscovery.js';
import { applyPlayerProfileToSprite, getDefaultPlayerProfile } from '../../services/playerProfile.js';
import { dailyQuestService } from '../../services/dailyQuests.js';
import { WORLD_MAP_PALETTE as P } from './constants.js';

export const worldMapProfilePanelMethods = {
  populateProfilePanel(panel, learner) {
    this.clearPanelBody(panel);
    this.ensureWorldIdleAnimation();

    const c = panel.body;
    const pad = panel.pad;
    const joinedRaw = learner.created_at || learner.createdAt || learner.joined_at || learner.joinedAt;
    const joined = joinedRaw ? new Date(joinedRaw).toLocaleDateString() : 'Unknown';
    const totalCompletions = this.catalog.reduce((sum, map) => sum + (map.playerState?.completions || 0), 0);
    const likedCount = this.catalog.filter((map) => map.playerState?.liked).length;
    const profile = gameState.getPlayerProfile() || getDefaultPlayerProfile();
    const dailySnapshot = dailyQuestService.getSnapshot();
    const stats = [
      { label: 'Name', value: learner.username ?? 'Unknown' },
      { label: 'Style', value: profile.label },
      { label: 'Level', value: learner.level ?? 1 },
      { label: 'Total XP', value: learner.total_xp ?? learner.totalXp ?? 0 },
      { label: 'Runs Cleared', value: totalCompletions },
      { label: 'Daily Streak', value: `${dailySnapshot.streak || 0} day(s)` },
      { label: 'Learning Streak', value: `${dailySnapshot.learningStreak || 0} day(s)` },
      { label: 'Liked Maps', value: likedCount },
      { label: 'Joined', value: joined }
    ];

    let y = 18;
    stats.forEach(({ label, value }) => {
      c.add(this.add.text(pad, y, `${label}:`, {
        fontSize: '14px',
        color: P.textSub,
        fontStyle: 'bold',
        stroke: '#060814',
        strokeThickness: 4
      }));
      c.add(this.add.text(panel.width - pad, y, String(value), {
        fontSize: '14px',
        color: P.textMain,
        fontStyle: 'bold',
        stroke: '#060814',
        strokeThickness: 4
      }).setOrigin(1, 0));
      y += 28;
    });

    const recommendations = mapDiscoveryService.getRecommendations(this.catalog, learner).slice(0, 2);
    y += 4;
    c.add(this.add.text(pad, y, 'Explorer Feed', {
      fontSize: '15px',
      color: P.gold,
      fontStyle: 'bold',
      stroke: '#060814',
      strokeThickness: 4
    }));
    y += 26;

    recommendations.forEach((line, index) => {
      c.add(this.add.text(pad, y, `${index + 1}. ${this.truncate(line, 44)}`, {
        fontSize: '13px',
        color: P.textMain,
        stroke: '#060814',
        strokeThickness: 3,
        wordWrap: { width: panel.width - pad * 2 }
      }));
      y += 38;
    });

    const xp = Number(learner.total_xp ?? learner.totalXp ?? 0);
    const lvl = Number(learner.level ?? 1);
    const thresh = Math.max(100, Math.floor(lvl * 140));
    const pct = Phaser.Math.Clamp((xp % thresh) / thresh, 0, 1);
    const barW = panel.width - pad * 2;
    const barH = 14;

    const track = this.add.graphics();
    track.fillStyle(P.xpTrack, 1);
    track.fillRoundedRect(pad, y, barW, barH, 3);
    track.lineStyle(1, P.xpBorder, 0.7);
    track.strokeRoundedRect(pad, y, barW, barH, 3);
    c.add(track);

    if (pct > 0) {
      const fillW = Math.max(6, Math.floor((barW - 4) * pct));
      const fill = this.add.graphics();
      fill.fillStyle(P.xpFill, 1);
      fill.fillRoundedRect(pad + 2, y + 2, fillW, barH - 4, 2);
      fill.fillStyle(0xffffff, 0.25);
      fill.fillRoundedRect(pad + 2, y + 2, fillW, Math.floor((barH - 4) * 0.5), { tl: 2, tr: 2, bl: 0, br: 0 });
      c.add(fill);
    }

    c.add(this.add.text(pad + barW / 2, y + barH / 2, `${xp % thresh} / ${thresh} XP`, {
      fontSize: '11px',
      color: '#ffffff',
      stroke: '#06101a',
      strokeThickness: 4
    }).setOrigin(0.5, 0.5));

    const avatarY = panel.height - 110;
    const avatar = this.add.sprite(panel.width / 2, avatarY, soldier.sheetKey, 0).setScale(3.2);
    avatar.play('wm_soldier_idle');
    applyPlayerProfileToSprite(avatar, profile);
    c.add(avatar);

    this.tweens.add({
      targets: avatar,
      y: avatar.y - 6,
      duration: 1300,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    const glow = this.add.graphics();
    glow.fillStyle(profile.tint, 0.18);
    glow.fillEllipse(panel.width / 2, avatarY + 28, 80, 20);
    c.add(glow);
  }
};
