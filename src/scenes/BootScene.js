import Phaser from 'phaser';
import { createTextures } from '../art/textures.js';

// 가장 먼저 열리는 장면: 도트 그림을 만들어 두고 첫 화면으로 넘어간다.
export default class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  create() {
    createTextures(this);
    this.scene.start('Title');
  }
}
