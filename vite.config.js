import { defineConfig } from 'vite';

export default defineConfig({
  // GitHub Pages는 https://<아이디>.github.io/<저장소>/ 아래에서 열리므로
  // 파일 경로를 상대 경로로 만들어 어느 주소에서든 열리게 한다.
  base: './',
});
