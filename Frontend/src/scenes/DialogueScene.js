import Phaser from 'phaser';
import { NPCRegistry } from '../characters/npcs/NPCRegistry';

export class DialogueScene extends Phaser.Scene {
  constructor() {
    super({ key: 'DialogueScene' });
    this.npc = null;
    this.dialogueIndex = 0;
    this.dialogues = [];
    this.pageIndex = 0;
    this.lessonPages = [];
    this.lessonTitleText = null;
    this.lessonBodyText = null;
    this.pageIndicatorText = null;
    this.dialogueText = null;
    this.isTyping = false;
    this.typingTimer = null;
    this.fullCurrentText = '';
  }

  init(data) {
    this.npc = data.npc;
    this.dialogueIndex = 0;

    this.lessonPages = data.lessonPages;
  }

  create() {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    // Semi-transparent overlay
    this.add.rectangle(0, 0, width, height, 0x000000, 0.7).setOrigin(0);

    const narrationH = 200;
    const narrationY = height - 150;
    const narrationTop = narrationY - narrationH / 2;

    const lessonH = Math.min(520, height * 0.5);
    const lessonY = (narrationTop -50) - lessonH / 2;
    const lessonW = Math.min(1100, width - 240);

    // Center lesson panel
    const lessonPanel = this.add.rectangle(
      width / 2,
      lessonY,
      lessonW,
      lessonH,
      0x10182b,
      0.98
    );
    lessonPanel.setStrokeStyle(3, 0x4a90e2);

    // Lesson title
    this.lessonTitleText = this.add.text(
      width / 2 - lessonW / 2 + 28,
      lessonY - lessonH / 2 + 22,
      '',
      {
        fontSize: '30px',
        color: '#9fd0ff',
        fontStyle: 'bold'
      }
    );

    // Lesson body
    this.lessonBodyText = this.add.text(
      width / 2 - lessonW / 2 + 28,
      lessonY - lessonH / 2 + 80,
      '',
      {
        fontSize: '22px',
        color: '#ffffff',
        wordWrap: { width: lessonW - 56 }
      }
    );

    // Page Indicator
    this.pageIndicatorText = this.add.text (
      width / 1.34 ,
      lessonY - lessonH / 2 + 470,
      '',
      {
        fontSize: '30px',
        color: '#9fd0ff',
        fontStyle: 'bold'
      }
    )

    // NPC portrait area
    const portraitX = 100;
    const portraitY = height - 150;
    
    this.add.rectangle(portraitX, portraitY, 120, 120, 0x16213e, 1)
      .setStrokeStyle(3, 0x4a90e2);
    
    // NPC icon - replaced emoji with graphics
    this.npcKey = this.npc?.name || '';
    this.npcDef = NPCRegistry[this.npcKey]
    this.createNPCIcon(portraitX, portraitY - this.npcDef.portraitOffsetY);

    // NPC name
    this.add.text(portraitX, portraitY + 80, this.npc.name, {
      fontSize: '18px',
      color: '#4a90e2',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    // Dialogue box
    const dialogueBox = this.add.rectangle(
      width / 2 + 50,
      height - 150,
      width - 300,
      200,
      0x16213e,
      0.95
    );
    dialogueBox.setStrokeStyle(3, 0x4a90e2);

    // Dialogue text
    this.dialogueText = this.add.text(
      230,
      height - 230,
      this.lessonPages[this.pageIndex].narrationLines,
      {
        fontSize: '20px',
        color: '#ffffff',
        wordWrap: { width: width - 350 }
      }
    );

    // Continue indicator
    const continueText = this.add.text(
      width - 330,
      height - 70,
      'Press space to continue',
      {
        fontSize: '16px',
        color: '#aaaaaa',
        fontStyle: 'italic'
      }
    );

    // Make scene interactive
    this.input.on('pointerdown', () => {
      this.nextDialogue();
    });

    // Show first dialogue
    this.renderPage();

    // Add keyboard support
    this.input.keyboard.on('keydown-RIGHT', () => this.nextPage());
    this.input.keyboard.on('keydown-LEFT', () => this.prevPage());
    this.input.keyboard.on('keydown-SPACE', () => this.closeDialogue());
  }

  createNPCIcon(x, y) {
    // Create a wizard/NPC icon using graphics

    const npcKey = this.npc?.name || '';

    if (npcKey && this.textures.exists(npcKey)) {
      this.add.sprite(x, y, npcKey, 0)
        .setDisplaySize(96, 96)
        .setDepth(10)
        .setScale(this.npcDef.scale);
      return;
    }
  }

  typeText(text) {
    if (this.typingTimer) {
      this.typingTimer.remove();
      this.typingTimer = null;
    }

    let charIndex = 0;
    this.isTyping = true;

    this.typingTimer = this.time.addEvent({
      delay: 30,
      callback: () => {
        if (charIndex < text.length) {
          this.dialogueText.text += text[charIndex];
          charIndex++;
        } else {
          this.isTyping = false;
          this.typingTimer.remove();
          this.typingTimer = null;
        }
      },
      loop: true
    });
  }

  renderPage() {
    const p = this.lessonPages[this.pageIndex];
    this.fullCurrentText = p.narration || '';
    this.dialogueText.setText(p.narrationLines);
    this.typeText(this.fullCurrentText);

    this.lessonTitleText.setText(p.lessonTitle);
    this.lessonBodyText.setText(p.lessonBody);
    this.pageIndicatorText.setText(`${this.pageIndex + 1}/${this.lessonPages.length}`);
  }

  nextPage() {
    if(!this.lessonPages.length) return;

    if (this.isTyping) {
      this.typingTimer?.remove();
      this.typingTimer = null;
      this.dialogueText.setText(this.fullCurrentText);
      this.isTyping = false;
      return;
    }

    this.pageIndex = (this.pageIndex + 1) % this.lessonPages.length;
    this.renderPage();
  }

  prevPage() {
    if (!this.lessonPages.length) return;

    this.pageIndex = (this.pageIndex - 1 + this.lessonPages.length) % this.lessonPages.length;
    this.renderPage();
  }

  closeDialogue() {
    this.scene.stop();
    this.scene.resume('GameMapScene');
  }
}