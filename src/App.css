/* =========================================================
   FC LINEUP MAKER - CUSTOM THEME (5 Colors)
   ========================================================= */

:root {
  /* ピッチの芝生（緑固定） */
  --pitch-dark: #2f4f2f;
  --pitch-light: #3a633a;
}

button {
  appearance: none;
  -webkit-appearance: none;
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 0;
  margin: 0;
  font-family: inherit;
}

* { box-sizing: border-box; }

body {
  margin: 0;
  padding: 0;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
}

.page { 
  display: flex; 
  flex-direction: column; 
  min-height: 100vh; 
  background-color: var(--theme-page-bg);
  color: var(--theme-main);
}

/* --- 2. ヘッダー --- */
.topbar {
  background: var(--theme-main);
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.brandBar { display: flex; align-items: center; gap: 12px; }
.logoBox { 
  width: 44px; height: 44px; 
  border-radius: 50%; 
  background: #fff; 
  border: 2px solid var(--theme-accent2); 
  overflow: hidden; flex-shrink: 0; 
}
.logoImg { width: 100%; height: 100%; object-fit: cover; }
.logoPlaceholder { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; font-size: 8px; color: var(--theme-main); opacity: 0.5; }
.teamName { font-size: 20px; font-weight: 700; color: #fff; line-height: 1.2; }

.controls { display: flex; justify-content: space-between; gap: 10px; }
.btn { 
  background: var(--theme-accent1); 
  border: 1px solid var(--theme-main); 
  color: #fff; 
  padding: 0 16px; height: 42px; border-radius: 8px; font-size: 13px; font-weight: bold; display: flex; align-items: center; justify-content: center; white-space: nowrap; 
}
.select { 
  flex: 1; height: 42px; 
  background: #fff; 
  color: var(--theme-main); 
  border: 1px solid var(--theme-accent2); 
  border-radius: 8px; text-align: center; font-size: 16px; font-weight: bold; 
}

/* --- 3. レイアウト全体 --- */
.layout {
  display: flex;
  flex-direction: column;
  padding-bottom: 40px;
  gap: 20px;
  width: 100%;
  max-width: 1200px; 
  margin: 0 auto;
}
.panelHeader { margin-bottom: 8px; }
.panelTitle { color: var(--theme-main); font-weight: bold; font-size: 13px; letter-spacing: 1px; }

/* --- 4. カレンダー & 週間集計 --- */
.section-calendar { padding: 0 12px; }
.calendarCard { 
  background: var(--theme-bg); 
  padding: 12px; border-radius: 12px; 
  border: 1px solid color-mix(in srgb, var(--theme-main) 10%, transparent); 
  margin-top: 10px; 
  box-shadow: 0 4px 6px rgba(0,0,0, 0.05);
}
.calendarHeader { display: flex; justify-content: space-between; margin-bottom: 12px; font-weight: bold; color: var(--theme-main); }
.navBtn { 
  width: 32px; height: 32px; border-radius: 50%; 
  border: 1px solid var(--theme-accent2); 
  color: var(--theme-accent1); 
  display: flex; align-items: center; justify-content: center; background: #fff; 
}

.weekRow { display: grid; grid-template-columns: repeat(7, 1fr); gap: 6px; margin-bottom: 6px; }
.weekDay { text-align: center; font-size: 12px; color: var(--theme-main); font-weight: bold; }
.weekDay.sunday { color: var(--theme-accent1); }
.weekDay.saturday { color: var(--theme-accent2); }

.calendarGrid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 6px; }
.dayCell { 
  aspect-ratio: 1; 
  background: #fff; 
  border-radius: 8px; 
  color: var(--theme-main);
  border: 2px solid transparent;
  display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: 500; 
  position: relative;
}
.dayCell.today { border-color: var(--theme-accent2) !important; }
.dayCell.selected { 
  background: var(--theme-accent1) !important; 
  color: #fff !important; 
  font-weight: bold !important; 
  border-color: var(--theme-accent2) !important;
}
.summaryCard {
  margin-top: 10px; padding: 8px 4px; 
  background: color-mix(in srgb, var(--theme-main) 5%, transparent); 
  border-radius: 8px; border: 1px solid color-mix(in srgb, var(--theme-main) 10%, transparent);
}
.summaryTitle {
  font-size: 12px; font-weight: bold; color: var(--theme-main); opacity: 0.8; margin-bottom: 5px; text-align: center;
}
.summaryDay {
  flex: 1; text-align: center; border-radius: 6px; padding: 4px 0; cursor: pointer; border: 1px solid transparent;
}
.summaryDay.selected {
  background: var(--theme-page-bg); 
  border-color: var(--theme-accent2);
}

/* --- 5. 出欠リスト --- */
.section-list { padding: 0 16px; }
.listGridWrapper { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }

.listRowCompact { 
  display: flex; flex-direction: column; 
  background: var(--theme-bg); 
  padding: 6px; border-radius: 8px; gap: 3px;
  border: 1px solid color-mix(in srgb, var(--theme-main) 10%, transparent); 
  box-shadow: 0 2px 4px rgba(0,0,0,0.03);
}
.listNameCompact { 
  background: transparent; border: none; 
  border-bottom: 1px solid color-mix(in srgb, var(--theme-main) 20%, transparent); 
  color: var(--theme-main); 
  font-size: 13px; font-weight: 500; text-align: center; width: 100%; 
}
.listBtnsCompact { display: flex; justify-content: space-between; gap: 4px; }
.listBtnCompact { 
  flex: 1; width: 28px; height: 30px; font-size: 14px; border-radius: 4px; 
  border: 1px solid color-mix(in srgb, var(--theme-main) 15%, transparent); 
  background: #fff; 
  color: color-mix(in srgb, var(--theme-main) 50%, transparent);
  display: flex; align-items: center; justify-content: center;
}
.listBtnCompact.ok.active { background: var(--theme-accent1); color: #fff; border-color: var(--theme-accent1); }
.listBtnCompact.maybe.active { background: var(--theme-accent2); color: #fff; border-color: var(--theme-accent2); }
.listBtnCompact.no.active { background: var(--theme-main); color: #fff; border-color: var(--theme-main); }

.deleteBtn {
  background: var(--theme-accent1); color: #fff; border: none; border-radius: 4px; 
  width: 20px; height: 20px; font-size: 10px; margin-right: 5px; cursor: pointer;
}
.addBtn {
  background: var(--theme-main); color: #fff; border: none; border-radius: 6px; 
  padding: 6px 16px; font-size: 13px; cursor: pointer; font-weight: bold; width: 100%;
}

.personalMemoInput {
  width: 100%; box-sizing: border-box; padding: 2px 4px; border-radius: 4px; 
  border: 1px solid color-mix(in srgb, var(--theme-main) 20%, transparent); 
  background: #fff; color: var(--theme-main); font-size: 11px;
}
.generalMemoInput {
  width: 100%; min-height: 40px; padding: 8px; margin-bottom: 15px;
  background: #fff; color: var(--theme-main); border-radius: 8px; font-size: 13px; resize: vertical; font-family: inherit; box-sizing: border-box;
  border: 1px solid color-mix(in srgb, var(--theme-main) 30%, transparent);
}
.generalMemoInput:focus, .personalMemoInput:focus {
  outline: 2px solid var(--theme-accent2);
  border-color: transparent;
}

/* --- 6. ベンチエリア --- */
.section-bench { padding: 0 16px; }
.benchGrid { display: grid; grid-template-columns: repeat(auto-fill, minmax(64px, 1fr)); gap: 8px; }
.benchCard { 
  background: var(--theme-bg); 
  border: 1px solid color-mix(in srgb, var(--theme-main) 15%, transparent); 
  padding: 8px 4px; border-radius: 8px; text-align: center; cursor: grab; 
  box-shadow: 0 2px 4px rgba(0,0,0,0.03);
}
.selected-m { border: 2px solid var(--theme-accent2); background: color-mix(in srgb, var(--theme-accent2) 10%, #fff); }
.benchName { font-size: 11px; margin-bottom: 4px; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; color: var(--theme-main); }
.benchStatus { font-weight: bold; font-size: 14px; color: var(--theme-main); }

/* --- 7. ピッチ --- */
.section-pitch {
  padding: 10px 0; 
  background: var(--theme-main); 
  border-top: 4px solid var(--theme-accent2);
  border-bottom: 4px solid var(--theme-accent2);
  display: flex;
  justify-content: center;
  align-items: flex-start;
}

.pitchWrap {
  width: 95%; max-width: 600px; aspect-ratio: 0.75; position: relative;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5);
  border-radius: 12px;
}

.pitch {
  width: 100%; height: 100%;
  
  /* ★修正：画像保存ライブラリ対策として、単色の緑を下地に塗りつつ、シマシマを全部手書きにしました */
  background-color: #2f4f2f;
  background-image: linear-gradient(
    to bottom,
    #2f4f2f 0%, #2f4f2f 10%,
    #3a633a 10%, #3a633a 20%,
    #2f4f2f 20%, #2f4f2f 30%,
    #3a633a 30%, #3a633a 40%,
    #2f4f2f 40%, #2f4f2f 50%,
    #3a633a 50%, #3a633a 60%,
    #2f4f2f 60%, #2f4f2f 70%,
    #3a633a 70%, #3a633a 80%,
    #2f4f2f 80%, #2f4f2f 90%,
    #3a633a 90%, #3a633a 100%
  );
  
  border: 4px solid rgba(255,255,255,0.8);
  border-radius: 12px;
  position: relative;
  overflow: hidden;
}

.lineLayer div { position: absolute; border: 1px solid rgba(255,255,255,0.7); }
.outerLine { top: 5%; bottom: 5%; left: 5%; right: 5%; border-width: 2px !important; }
.halfLine { top: 50%; left: 5%; right: 5%; }
.centerCircle { top: 50%; left: 50%; transform: translate(-50%,-50%); width: 22%; height: 15%; border-radius: 50%; }
.penTop { top: 5%; left: 24%; width: 52%; height: 16%; }
.penBottom { bottom: 5%; left: 24%; width: 52%; height: 16%; }

.posSlot {
  width: 58px; height: 58px;
  position: absolute; transform: translate(-50%, -50%);
  background: rgba(255, 255, 255, 0.2); 
  backdrop-filter: blur(2px); -webkit-backdrop-filter: blur(2px);
  border: 1px solid rgba(255, 255, 255, 0.6); border-radius: 50%;
  display: flex; flex-direction: column; justify-content: center; align-items: center;
  z-index: 10; cursor: pointer; box-shadow: 0 4px 8px rgba(0,0,0,0.3);
}

.waiting-drop { background: rgba(202, 158, 69, 0.5); border-color: var(--theme-accent2); transform: translate(-50%, -50%) scale(1.1); }
.posRole { font-size: 10px; font-weight: 800; color: #fff; margin-bottom: 2px; text-shadow: 0 1px 3px rgba(0,0,0,0.8); }
.posEmpty { font-size: 9px; color: rgba(255,255,255,0.9); font-weight: bold; }
.posName { 
  width: 50px; font-size: 12px; background: #fff; 
  border: #fff; border-radius: 12px; padding: 2px 0; overflow: hidden; text-align: center; font-weight: bold; 
  color: var(--theme-main); box-shadow: 0 2px 4px rgba(0,0,0,0.3); 
}

.slot-ok { background: var(--theme-accent1) !important; border-color: #fff !important; color: #fff; } 
.slot-maybe { background: var(--theme-accent2) !important; border-color: #fff !important; } 

/* --- フォーメーション --- */
.section-formation {
  background: var(--theme-bg); padding: 15px; border-radius: 12px; 
  border: 1px solid color-mix(in srgb, var(--theme-main) 10%, transparent); 
  box-shadow: 0 4px 6px rgba(0,0,0, 0.05);
}

/* --- 8. 管理画面 --- */
.adminPanelMobile { 
  margin: 10px; padding: 15px; background: var(--theme-bg); 
  border-radius: 12px; border: 2px solid var(--theme-accent2); 
  display: flex; flex-direction: column; gap: 15px; 
}
.adminField { display: flex; flex-direction: column; gap: 6px; }
.adminLabel { font-size: 12px; color: var(--theme-main); font-weight: bold; }
.colorHint { font-size: 12px; color: var(--theme-main); opacity: 0.7; }

.textInput { 
  height: 44px; padding: 10px; background: #fff; color: var(--theme-main); 
  border: 1px solid color-mix(in srgb, var(--theme-main) 30%, transparent); 
  border-radius: 8px; font-size: 16px; 
}
input[type="file"], input[type="color"] {
  background: #fff; border: 1px solid color-mix(in srgb, var(--theme-main) 30%, transparent);
  border-radius: 8px; color: var(--theme-main); padding: 8px;
}

/* ★★★ PC向けのレイアウト調整 ★★★ */
@media (min-width: 768px) {
  .layout {
    display: grid; grid-template-columns: 350px 1fr; grid-template-rows: auto auto auto;
    align-items: start; gap: 20px; padding: 20px;
  }
  .section-calendar { grid-column: 1 / 2; grid-row: 1 / 2; max-width: 100%; }
  .section-list { grid-column: 1 / 2; grid-row: 2 / 4; overflow-y: auto; max-height: 80vh; }
  .listGridWrapper { grid-template-columns: 1fr; }
  .section-bench { grid-column: 2 / 3; grid-row: 1 / 2; }
  .section-pitch { grid-column: 2 / 3; grid-row: 2 / 3; background: transparent; border: none; min-height: auto; }
  .section-formation { grid-column: 2 / 3; grid-row: 3 / 4; max-width: 600px; margin: 0 auto; width: 100%; }
}

/* --- カレンダーのマーク（ドット） --- */
.memo-dot {
  position: absolute; bottom: 4px; left: 50%; transform: translateX(-50%);
  width: 5px; height: 5px; background-color: var(--theme-accent1); border-radius: 50%;
}
.dayCell.selected .memo-dot { background-color: #fff; }

/* --- 画像書き出しボタン --- */
.exportBtn {
  background: var(--theme-accent2);
  color: #fff;
  border: none;
  border-radius: 6px;
  padding: 8px 16px;
  font-size: 13px;
  font-weight: bold;
  cursor: pointer;
  display: flex;
  align-items: center;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  transition: opacity 0.2s;
}

.exportBtn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
