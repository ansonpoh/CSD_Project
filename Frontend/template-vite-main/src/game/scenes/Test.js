import { Scene } from "phaser";
import axios from "axios";

export class Test extends Scene
{
    constructor () {
        super('Test')
    }

    async fetchData() {
        try {
            const res = await axios.get(`http://localhost:8080/api/learner/all`);
            this.statusText.setText(`Backend says: ${res.data.message ?? JSON.stringify(res.data)}`);
        } catch (err) {
            this.statusText.setText("Failed to load data from backend");
            console.error(err);
        }
    }

    create() {
        this.add.image(512, 384, "background");
        this.statusText = this.add.text(40, 40, "Loading...", {
            fontSize: "24px",
            color: "#ffffff",
            wordWrap: { width: this.scale.width - 80, useAdvancedWrap: true },
        });

        this.fetchData();

        this.input.once('pointerdown', () => {

            this.scene.start('Test');

        });
    }

}