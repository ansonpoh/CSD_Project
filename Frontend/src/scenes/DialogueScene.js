import Phaser from 'phaser';
import { NPCRegistry } from '../characters/npcs/NPCRegistry';

export class DialogueScene extends Phaser.Scene {
  constructor() {
    super({ key: 'DialogueScene' });
    this.npc = null;
    this.dialogueIndex = 0;
    this.dialogues = [];
    this.dialogueText = null;
  }

  init(data) {
    this.npc = data.npc;
    this.dialogueIndex = 0;
    
    // Sample dialogues
    this.dialogues = [
      `Hello, traveler! I am ${this.npc.name}.`,
      "These lands have been troubled lately...",
      "Monsters roam freely, and darkness spreads.",
      "Perhaps you could help us? We need brave adventurers.",
      "May fortune favor you on your journey!"
    ];
  }

  create() {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    // Semi-transparent overlay
    this.add.rectangle(0, 0, width, height, 0x000000, 0.7).setOrigin(0);

    // NPC portrait area
    const portraitX = 100;
    const portraitY = height - 150;
    
    this.add.rectangle(portraitX, portraitY, 120, 120, 0x16213e, 1)
      .setStrokeStyle(3, 0x4a90e2);
    
    // NPC icon - replaced emoji with graphics
    this.npcKey = this.npc?.name?.toLowerCase?.() || '';
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
      280,
      height - 230,
      '',
      {
        fontSize: '20px',
        color: '#ffffff',
        wordWrap: { width: width - 350 }
      }
    );

    // Continue indicator
    const continueText = this.add.text(
      width - 150,
      height - 70,
      'Click to continue',
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
    this.showDialogue();

    // Add keyboard support
    this.input.keyboard.on('keydown-SPACE', () => {
      this.nextDialogue();
    });
  }

  createNPCIcon(x, y) {
    // Create a wizard/NPC icon using graphics

    const npcKey = this.npc?.name?.toLowerCase?.() || '';

    if (npcKey && this.textures.exists(npcKey)) {
      this.add.sprite(x, y, npcKey, 0)
        .setDisplaySize(96, 96)
        .setDepth(10)
        .setScale(this.npcDef.scale);
      return;
    }
  }

  showDialogue() {
    if (this.dialogueIndex < this.dialogues.length) {
      const text = this.dialogues[this.dialogueIndex];
      this.dialogueText.setText('');
      
      // Typewriter effect
      this.typeText(text);
    }
  }

  typeText(text) {
    let charIndex = 0;
    const typingSpeed = 30;

    const timer = this.time.addEvent({
      delay: typingSpeed,
      callback: () => {
        if (charIndex < text.length) {
          this.dialogueText.text += text[charIndex];
          charIndex++;
        } else {
          timer.remove();
        }
      },
      loop: true
    });
  }

  nextDialogue() {
    this.dialogueIndex++;
    
    if (this.dialogueIndex < this.dialogues.length) {
      this.showDialogue();
    } else {
      // End dialogue
      this.closeDialogue();
    }
  }

  closeDialogue() {
    this.scene.stop();
    this.scene.resume('GameMapScene');
  }
}