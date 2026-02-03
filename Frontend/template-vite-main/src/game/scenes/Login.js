import { Scene } from 'phaser';

export class Login extends Scene {
    constructor() {
        super('Login');
        
        this.users = [
            { username: 'player1', password: '1234' },
            { username: 'admin', password: 'admin' },
            { username: 'guest', password: 'guest' }
        ];
        
        // Input state
        this.username = '';
        this.password = '';
        this.currentField = null;
        
        // UI elements
        this.usernameText = null;
        this.passwordText = null;
        this.cursor = null;
        this.errorText = null;
        this.blinkTimer = null;
    }

    create() {
        this.createUI();
        this.setupInput();
    }

    createUI() {
        // Background & title
        this.cameras.main.setBackgroundColor(0x000000);
        this.add.text(512, 150, 'Welcome!', {
            fontFamily: 'Arial Black', fontSize: 64, color: '#ffffff',
            stroke: '#000000', strokeThickness: 5
        }).setOrigin(0.5);

        // Username field
        this.add.rectangle(512, 300, 400, 60, 0xffffff)
            .setStrokeStyle(4, 0x000000)
            .setInteractive()
            .on('pointerdown', () => this.selectField('username'));
        
        this.usernameText = this.add.text(350, 300, 'Username', {
            fontFamily: 'Arial', fontSize: 32, color: '#b5b5b5'
        }).setOrigin(0, 0.5);

        // Password field
        this.add.rectangle(512, 400, 400, 60, 0xffffff)
            .setStrokeStyle(4, 0x000000)
            .setInteractive()
            .on('pointerdown', () => this.selectField('password'));
        
        this.passwordText = this.add.text(350, 400, 'Password', {
            fontFamily: 'Arial', fontSize: 32, color: '#b5b5b5'
        }).setOrigin(0, 0.5);

        // Cursor
        this.cursor = this.add.text(350, 300, '|', {
            fontFamily: 'Arial', fontSize: 32, color: '#000000'
        }).setOrigin(0, 0.5).setVisible(false);

        // Login button
        const button = this.add.rectangle(512, 500, 200, 70, 0x4C7348)
            .setStrokeStyle(4, 0x000000)
            .setInteractive();
        
        this.add.text(512, 500, 'Login', {
            fontFamily: 'Arial', fontSize: 36, color: '#ffffff'
        }).setOrigin(0.5);
        
        button.on('pointerdown', () => this.login());
        button.on('pointerover', () => button.setFillStyle(0x2F472D));
        button.on('pointerout', () => button.setFillStyle(0x4C7348));

        // Error text
        this.errorText = this.add.text(512, 580, '', {
            fontFamily: 'Arial', fontSize: 24, color: '#db5858'
        }).setOrigin(0.5);

        //for forgot password feature
        this.add.text(512, 650, 'Forgot password? Skill issue (will add that feature if have time!)', {
            fontFamily: 'Arial',
            fontSize: 20,
            color: '#aaaaaa',
            align: 'center'
        }).setOrigin(0.5);

        //for sign-up feature
        this.add.text(512, 700, 'Do not have an account? Sign up now (will add that feature later)', {
            fontFamily: 'Arial',
            fontSize: 20,
            color: '#aaaaaa',
            align: 'center'
        }).setOrigin(0.5);
    }

    setupInput() {
        this.input.keyboard.on('keydown', (event) => {
            if (!this.currentField) return;
            
            if (event.key === 'Backspace') {
                this.deleteChar();
            } else if (event.key === 'Enter') {
                this.currentField === 'password' ? this.login() : this.selectField('password');
            } else if (event.key === 'Tab') {
                event.preventDefault();
                this.selectField(this.currentField === 'username' ? 'password' : 'username');
            } else if (event.key.length === 1) {
                this.addChar(event.key);
            }
            
            this.updateCursor();
        });
    }

    selectField(field) {
        this.currentField = field;
        this.updateDisplay();
        this.updateCursor();
    }

    addChar(char) {
        if (this.currentField === 'username') {
            if (this.username === '') this.usernameText.setText('').setColor('#000000');
            this.username += char;
            this.usernameText.setText(this.username);
        } else {
            if (this.password === '') this.passwordText.setText('').setColor('#000000');
            this.password += char;
            this.passwordText.setText('*'.repeat(this.password.length));
        }
        this.errorText.setText('');
    }

    deleteChar() {
        if (this.currentField === 'username' && this.username.length > 0) {
            this.username = this.username.slice(0, -1);
            this.usernameText.setText(this.username || 'Username');
            this.usernameText.setColor(this.username ? '#000000' : '#b5b5b5');
        } else if (this.currentField === 'password' && this.password.length > 0) {
            this.password = this.password.slice(0, -1);
            this.passwordText.setText(this.password ? '*'.repeat(this.password.length) : 'Password');
            this.passwordText.setColor(this.password ? '#000000' : '#b5b5b5');
        }
    }

    updateDisplay() {
        // Update colors based on active field
        const userColor = this.currentField === 'username' 
        ? (this.username ? '#000000' : '#b5b5b5') // Active: black if text, light gray if placeholder
        : (this.username ? '#000000' : '#b5b5b5'); // Inactive: sames
    
        const passColor = this.currentField === 'password'
        ? (this.password ? '#000000' : '#b5b5b5')
        : (this.password ? '#000000' : '#b5b5b5');
        
        this.usernameText.setColor(userColor);
        this.passwordText.setColor(passColor);
        
        this.errorText.setText('');
    }

    updateCursor() {
        if (!this.currentField) {
            this.cursor.setVisible(false);
            return;
        }
        
        const field = this.currentField === 'username' ? this.usernameText : this.passwordText;
        const hasText = this.currentField === 'username' ? this.username : this.password;
        
        const x = 350 + (hasText ? field.width : 0);
        const y = this.currentField === 'username' ? 300 : 400;
        
        this.cursor.setPosition(x, y);
        this.showCursor();
    }

    showCursor() {
        if (!this.currentField) {
            this.cursor.setVisible(false);
            return;
        }
        
        this.cursor.setVisible(true);
        this.startBlink();
    }

    startBlink() {
        if (this.blinkTimer) this.blinkTimer.remove();
        
        this.blinkTimer = this.time.addEvent({
            delay: 500,
            callback: () => {
                if (!this.currentField) return;
                this.cursor.setVisible(!this.cursor.visible);
            },
            loop: true
        });
    }

    login() {
        this.cursor.setVisible(false);
        
        if (!this.username.trim() || !this.password.trim()) {
            this.errorText.setText('Please enter both username and password');
            this.showCursor();
            return;
        }
        
        const user = this.users.find(u => 
            u.username === this.username && u.password === this.password
        );
        
        if (user) {
            this.errorText.setText('Login successful!').setColor('#93d693');
            this.game.user = { username: this.username, loggedIn: true };
            
            this.time.delayedCall(1000, () => {
                this.scene.start('MainMenu');
            });
        } else {
            this.errorText.setText('Invalid username or password');
            this.password = '';
            this.passwordText.setText('Password').setColor('#b5b5b5');
            this.updateCursor();
            
            this.tweens.add({
                targets: [this.usernameText, this.passwordText, this.cursor],
                x: '+=6',
                yoyo: true,
                duration: 50,
                repeat: 2,
                onComplete: () => this.showCursor()
            });
        }
    }

    shutdown() {
        if (this.blinkTimer) this.blinkTimer.remove();
    }
}