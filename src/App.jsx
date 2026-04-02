import { useEffect, useMemo, useState } from "react";
import { initializeApp } from "firebase/app";
import { getDatabase, ref, set, onValue } from "firebase/database";
import { FORMATIONS } from "./formations";
import html2canvas from "html2canvas";
import "./App.css";

// --- Firebase設定 ---
const firebaseConfig = {
  apiKey: "AIzaSyCKPgR0jrOxXH2wBEBdEg-oHC7mHPZD6DM",
  authDomain: "fc-clubs-management.firebaseapp.com",
  projectId: "fc-clubs-management",
  storageBucket: "fc-clubs-management.firebasestorage.app",
  messagingSenderId: "498521204900",
  appId: "1:498521204900:web:1d27cbe0222468f82dde31"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// --- Helpers ---
const toKey = (d) => {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

const addMonths = (d, n) => new Date(d.getFullYear(), d.getMonth() + n, 1);

const INITIAL_MEMBERS = Array.from({ length: 20 }, (_, i) => ({
  id: `m${i + 1}`,
  label: `Member ${i + 1}`,
}));

const ADMIN_CODE_DEFAULT = "1234";

const DEFAULT_COLORS = {
  main: "#3e3226",    
  accent1: "#9a2c2e", 
  accent2: "#ca9e45", 
  bg: "#e8e2d2",      
  pageBg: "#f2eee2"   
};

// --- Sub Components ---
function WeeklySummary({ currentKey, statusByDate, onSelectDate, membersCount }) {
  if (!currentKey) return null;

  const targetDate = new Date(currentKey);
  const day = targetDate.getDay(); 
  const diff = targetDate.getDate() - (day === 0 ? 6 : day - 1);
  const monday = new Date(targetDate.setDate(diff));

  const weekData = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const key = toKey(d);
    
    const dayStatuses = statusByDate[key] || {};
    let ok = 0, maybe = 0, no = 0;
    Object.values(dayStatuses).forEach(val => {
      if (val === "ok") ok++;
      if (val === "maybe") maybe++;
      if (val === "no") no++;
    });
    const unknown = Math.max(0, membersCount - (ok + maybe + no));

    weekData.push({ date: d, key, ok, maybe, no, unknown });
  }

  const WEEKS = ["月", "火", "水", "木", "金", "土", "日"];

  return (
    <div className="summaryCard">
      <div className="summaryTitle">
        週間集計 ({toKey(monday).slice(5).replace('-', '/')} 〜)
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
        {weekData.map((item, idx) => {
          const isSelected = item.key === currentKey;
          const isSat = idx === 5;
          const isSun = idx === 6;
          return (
            <div 
              key={item.key} 
              onClick={() => onSelectDate(item.key)}
              className={`summaryDay ${isSelected ? 'selected' : ''}`}
            >
              <div style={{ fontWeight: 'bold', color: isSun ? 'var(--theme-accent1)' : isSat ? 'var(--theme-accent2)' : 'var(--theme-main)' }}>
                {WEEKS[idx]} <span style={{ fontSize: '9px', fontWeight: 'normal', opacity: 0.7 }}>{item.date.getDate()}</span>
              </div>
              <div style={{ marginTop: '4px', lineHeight: '1.2' }}>
                <div style={{ color: 'var(--theme-accent1)' }}>○ {item.ok}</div>
                <div style={{ color: 'var(--theme-accent2)' }}>△ {item.maybe}</div>
                <div style={{ color: 'var(--theme-main)' }}>× {item.no}</div>
                <div style={{ color: 'var(--theme-main)', opacity: 0.5 }}>- {item.unknown}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Calendar({ monthDate, selectedKey, onSelectDate, onPrev, onNext, generalMemosByDate = {} }) {
  const start = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
  const end = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);
  const startDow = (start.getDay() + 6) % 7; 
  const daysInMonth = end.getDate();
  
  const cells = [];
  for (let i = 0; i < startDow; i++) cells.push(null);
  for (let day = 1; day <= daysInMonth; day++) cells.push(new Date(monthDate.getFullYear(), monthDate.getMonth(), day));
  while (cells.length % 7 !== 0) cells.push(null);

  const DAYS = ["月", "火", "水", "木", "金", "土", "日"];

  return (
    <div className="calendarCard">
      <div className="calendarHeader">
        <button className="navBtn" onClick={onPrev} type="button">‹</button>
        <div className="calendarTitle">{toKey(monthDate).substring(0, 7)}</div>
        <button className="navBtn" onClick={onNext} type="button">›</button>
      </div>
      <div className="weekRow">
        {DAYS.map(d => <div key={d} className={`weekDay ${d === "日" ? "sunday" : d === "土" ? "saturday" : ""}`}>{d}</div>)}
      </div>
      <div className="calendarGrid">
        {cells.map((d, idx) => {
          if (!d) return <div key={idx} className="dayCell empty" />;
          const key = toKey(d);
          const isToday = key === toKey(new Date());
          const isSelected = key === selectedKey;
          const hasMemo = generalMemosByDate[key] && generalMemosByDate[key].trim() !== "";

          return (
            <button
              key={key}
              type="button"
              className={`dayCell ${isSelected ? "selected" : ""} ${isToday ? "today" : ""}`}
              onClick={() => onSelectDate(key)}
            >
              {d.getDate()}
              {hasMemo && <div className="memo-dot" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// --- Main Component ---
export default function App() {
  const keys = Object.keys(FORMATIONS);
  
  const [membersList, setMembersList] = useState(INITIAL_MEMBERS);
  const [formationByDate, setFormationByDate] = useState({});
  const [defaultFormation, setDefaultFormation] = useState(keys[0] || "3-4-2-1");
  const [teamName, setTeamName] = useState("TEAM NAME");
  const [logoDataUrl, setLogoDataUrl] = useState("");
  
  // ★追加：メンバー個別のアイコン画像
  const [memberImages, setMemberImages] = useState({});

  const [themeMain, setThemeMain] = useState(DEFAULT_COLORS.main);
  const [themeAccent1, setThemeAccent1] = useState(DEFAULT_COLORS.accent1);
  const [themeAccent2, setThemeAccent2] = useState(DEFAULT_COLORS.accent2);
  const [themeBg, setThemeBg] = useState(DEFAULT_COLORS.bg);
  const [themePageBg, setThemePageBg] = useState(DEFAULT_COLORS.pageBg); 
  
  const [isAdmin, setIsAdmin] = useState(false);
  const [isMaster, setIsMaster] = useState(false);
  const [adminCode, setAdminCode] = useState(ADMIN_CODE_DEFAULT);
  const [selectedMemberId, setSelectedMemberId] = useState(null);
  const [names, setNames] = useState({});
  const [monthDate, setMonthDate] = useState(() => new Date());
  const [selectedDateKey, setSelectedDateKey] = useState(() => toKey(new Date()));
  const [statusByDate, setStatusByDate] = useState({});
  const [memosByDate, setMemosByDate] = useState({});
  const [placedBySlotByDate, setPlacedBySlotByDate] = useState({});
  const [generalMemosByDate, setGeneralMemosByDate] = useState({});
  const [isLoaded, setIsLoaded] = useState(false);
  
  const [isExporting, setIsExporting] = useState(false);
  const [batchModalMemberId, setBatchModalMemberId] = useState(null);

  const currentFormation = formationByDate[selectedDateKey] || defaultFormation || keys[0];
  const status = statusByDate[selectedDateKey] || {};
  const placedBySlot = placedBySlotByDate[selectedDateKey] || {};
  const slots = useMemo(() => FORMATIONS[currentFormation] ?? [], [currentFormation]);

  const currentWeekDates = useMemo(() => {
    const target = new Date(selectedDateKey);
    const day = target.getDay();
    const diff = target.getDate() - (day === 0 ? 6 : day - 1);
    const monday = new Date(target.setDate(diff));
    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      days.push(d);
    }
    return days;
  }, [selectedDateKey]);

  useEffect(() => {
    const dbRef = ref(db, 'teamData/');
    const unsubscribe = onValue(dbRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        if (data.teamName) setTeamName(data.teamName);
        if (data.logoDataUrl) setLogoDataUrl(data.logoDataUrl);
        if (data.names) setNames(data.names);
        if (data.formationByDate) setFormationByDate(data.formationByDate);
        if (data.defaultFormation) setDefaultFormation(data.defaultFormation);
        if (data.statusByDate) setStatusByDate(data.statusByDate);
        if (data.memosByDate) setMemosByDate(data.memosByDate);
        if (data.placedBySlotByDate) setPlacedBySlotByDate(data.placedBySlotByDate);
        if (data.adminCode) setAdminCode(data.adminCode);
        if (data.membersList) setMembersList(data.membersList);
        if (data.generalMemosByDate) setGeneralMemosByDate(data.generalMemosByDate);
        if (data.memberImages) setMemberImages(data.memberImages); // 画像読み込み
        
        if (data.themeMain) setThemeMain(data.themeMain);
        if (data.themeAccent1) setThemeAccent1(data.themeAccent1);
        if (data.themeAccent2) setThemeAccent2(data.themeAccent2);
        if (data.themeBg) setThemeBg(data.themeBg);
        if (data.themePageBg) setThemePageBg(data.themePageBg); 
      }
      setIsLoaded(true);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!isLoaded) return;
    const dbRef = ref(db, 'teamData/');
    set(dbRef, {
      teamName, logoDataUrl, names, formationByDate, defaultFormation, statusByDate, memosByDate, placedBySlotByDate, adminCode, membersList, generalMemosByDate,
      themeMain, themeAccent1, themeAccent2, themeBg, themePageBg, memberImages // 画像保存
    });
  }, [teamName, logoDataUrl, names, formationByDate, defaultFormation, statusByDate, memosByDate, placedBySlotByDate, adminCode, membersList, generalMemosByDate, themeMain, themeAccent1, themeAccent2, themeBg, themePageBg, memberImages, isLoaded]);

  useEffect(() => {
    document.body.style.backgroundColor = themePageBg;
  }, [themePageBg]);

  const handleLogoChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => setLogoDataUrl(e.target.result);
    reader.readAsDataURL(file);
  };

  const placeMember = (mId, sId) => {
    if (!mId) return;
    const st = status[mId];
    if (st !== "ok" && st !== "maybe") return;
    setPlacedBySlotByDate((prev) => {
      const nextDay = { ...(prev[selectedDateKey] || {}) };
      for (const k in nextDay) if (nextDay[k] === mId) delete nextDay[k];
      nextDay[sId] = mId;
      return { ...prev, [selectedDateKey]: nextDay };
    });
    setSelectedMemberId(null);
  };

  const removeFromSlot = (sId) => {
    setPlacedBySlotByDate((prev) => {
      const nextDay = { ...(prev[selectedDateKey] || {}) };
      delete nextDay[sId];
      return { ...prev, [selectedDateKey]: nextDay };
    });
  };

  const setStatusFor = (id, val) => {
    setStatusByDate((prev) => {
      const currentDay = prev[selectedDateKey] || {};
      const currentVal = currentDay[id]; 
      const newDay = { ...currentDay };
      if (currentVal === val) {
        delete newDay[id];
      } else {
        newDay[id] = val;
      }
      return { ...prev, [selectedDateKey]: newDay };
    });
  };

  const handleAddMember = () => {
    const newId = `m${Date.now()}`;
    setMembersList([...membersList, { id: newId, label: `Member` }]);
  };

  const handleDeleteMember = (id) => {
    if (window.confirm("このメンバーを削除しますか？\n（過去のデータは残りますが、リストからは消えます）")) {
      setMembersList(membersList.filter(m => m.id !== id));
      // 画像も削除
      setMemberImages(prev => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    }
  };

  const handleExportImage = async () => {
    const target = document.getElementById("pitch-export-area");
    if (!target) return;
    setIsExporting(true);
    try {
      const canvas = await html2canvas(target, { scale: 2, useCORS: true, backgroundColor: themeBg });
      const dataUrl = canvas.toDataURL("image/png");
      if (navigator.share) {
        try {
          const response = await fetch(dataUrl);
          const blob = await response.blob();
          const file = new File([blob], `formation_${selectedDateKey}.png`, { type: 'image/png' });
          if (navigator.canShare && navigator.canShare({ files: [file] })) {
            await navigator.share({ title: `${teamName} フォーメーション`, files: [file] });
            setIsExporting(false);
            return;
          }
        } catch (shareError) {
          console.log("Share API キャンセルまたはエラー:", shareError);
        }
      }
      const link = document.createElement("a");
      link.href = dataUrl;
      link.download = `formation_${selectedDateKey}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("画像生成エラー:", error);
      alert("画像の生成に失敗しました。");
    } finally {
      setIsExporting(false);
    }
  };

  const benchMembers = membersList.filter(m => (status[m.id] === "ok" || status[m.id] === "maybe") && !Object.values(placedBySlot).includes(m.id));

  return (
    <div className="page" style={{
      '--theme-main': themeMain,
      '--theme-accent1': themeAccent1,
      '--theme-accent2': themeAccent2,
      '--theme-bg': themeBg,
      '--theme-page-bg': themePageBg
    }}>
      <header className="topbar">
        <div className="brandBar">
          <div className="logoBox">
            {logoDataUrl ? <img className="logoImg" src={logoDataUrl} alt="logo" /> : <div className="logoPlaceholder">LOGO</div>}
          </div>
          <div className="teamName">{teamName}</div>
        </div>
        <div className="controls">
          <button className="btn" type="button" onClick={() => {
            if (isAdmin || isMaster) { setIsAdmin(false); setIsMaster(false); }
            else {
              const code = window.prompt("ENTER CODE");
              if (code === "5963") { setIsMaster(true); alert("マスター権限"); }
              else if (code === adminCode) { setIsAdmin(true); alert("管理者権限"); }
              else { alert("コードが違います"); }
            }
          }}>{(isAdmin || isMaster) ? "ログアウト" : "管理者"}</button>
        </div>
      </header>

      {(isAdmin || isMaster) && (
        <div className="adminPanelMobile">
          <div className="adminField">
            <label className="adminLabel">チーム名設定</label>
            <input className="textInput" value={teamName} onChange={(e) => setTeamName(e.target.value)} />
          </div>
          <div className="adminField">
            <label className="adminLabel">チームロゴ変更</label>
            <input type="file" accept="image/*" onChange={handleLogoChange} />
          </div>

          <div className="adminField">
            <label className="adminLabel">チームカラー設定 (5色)</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '5px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span className="colorHint">1. メイン（ヘッダー・×・文字）</span>
                <input type="color" value={themeMain} onChange={(e) => setThemeMain(e.target.value)} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span className="colorHint">2. アクセント1（〇・日曜・強調）</span>
                <input type="color" value={themeAccent1} onChange={(e) => setThemeAccent1(e.target.value)} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span className="colorHint">3. アクセント2（△・土曜・枠線）</span>
                <input type="color" value={themeAccent2} onChange={(e) => setThemeAccent2(e.target.value)} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span className="colorHint">4. 背景１（カード等の土台）</span>
                <input type="color" value={themeBg} onChange={(e) => setThemeBg(e.target.value)} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span className="colorHint">5. 背景２（一番外側・日付の色）</span>
                <input type="color" value={themePageBg} onChange={(e) => setThemePageBg(e.target.value)} />
              </div>
            </div>
          </div>

          <div className="adminField">
            <label className="adminLabel">全体デフォルトフォーメーション</label>
            <select className="select" value={defaultFormation} onChange={(e) => setDefaultFormation(e.target.value)}>
              {keys.map(k => <option key={k} value={k}>{k}</option>)}
            </select>
          </div>
          <div className="adminField">
            <label className="adminLabel" style={{ color: 'var(--theme-accent1)' }}>管理者パスコード変更</label>
            <input className="textInput" type="text" value={adminCode} onChange={(e) => setAdminCode(e.target.value)} style={{ borderColor: 'var(--theme-accent1)' }} />
          </div>

          {/* ★追加：メンバーアイコン登録画面 */}
          <div className="adminField" style={{ marginTop: '10px' }}>
            <label className="adminLabel">
              メンバーのアイコン画像設定
              <span style={{ fontSize: '10px', fontWeight: 'normal', color: 'var(--theme-accent1)', display: 'block' }}>
                ※推奨: 正方形で2MB以下の画像
              </span>
            </label>
            <div style={{ 
              maxHeight: '220px', overflowY: 'auto', padding: '10px', 
              background: '#fff', borderRadius: '8px', 
              border: '1px solid color-mix(in srgb, var(--theme-main) 30%, transparent)' 
            }}>
              {membersList.map(m => (
                <div key={`img-${m.id}`} style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingBottom: '8px', borderBottom: '1px solid #eee', marginBottom: '8px' }}>
                  <span style={{ fontSize: '13px', width: '70px', overflow: 'hidden', whiteSpace: 'nowrap', color: 'var(--theme-main)', fontWeight: 'bold' }}>
                    {names[m.id] || m.label}
                  </span>
                  
                  <input type="file" accept="image/*" style={{ flex: 1, fontSize: '11px', padding: 0, border: 'none' }} onChange={(e) => {
                    const file = e.target.files[0];
                    if (!file) return;
                    if (file.size > 2 * 1024 * 1024) { 
                      alert("画像サイズが大きすぎます。2MB以下の画像にしてください。"); 
                      e.target.value = ''; 
                      return; 
                    }
                    const r = new FileReader();
                    r.onload = (ev) => setMemberImages(prev => ({ ...prev, [m.id]: ev.target.result }));
                    r.readAsDataURL(file);
                  }} />

                  {memberImages[m.id] && (
                    <img src={memberImages[m.id]} alt="icon" style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover', border: '1px solid var(--theme-accent2)' }} />
                  )}

                  {memberImages[m.id] && (
                    <button type="button" onClick={() => {
                      if(window.confirm('この画像を削除しますか？')) {
                        setMemberImages(prev => { const n = {...prev}; delete n[m.id]; return n; });
                      }
                    }} style={{ background: 'var(--theme-main)', color: '#fff', padding: '4px 8px', borderRadius: '4px', fontSize: '10px', cursor: 'pointer' }}>
                      削除
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

        </div>
      )}

      <div className="layout">
        
        <div className="section-calendar">
          <Calendar 
            monthDate={monthDate} 
            selectedKey={selectedDateKey} 
            onSelectDate={setSelectedDateKey} 
            onPrev={() => setMonthDate(addMonths(monthDate, -1))} 
            onNext={() => setMonthDate(addMonths(monthDate, 1))} 
            generalMemosByDate={generalMemosByDate}
          />
          <WeeklySummary 
            currentKey={selectedDateKey} 
            statusByDate={statusByDate} 
            onSelectDate={setSelectedDateKey} 
            membersCount={membersList.length} 
          />
        </div>

        <div className="section-list">
          
          <div className="panelHeader"><div className="panelTitle">全体メモ</div></div>
          <textarea
            className="generalMemoInput"
            placeholder="全体への連絡事項"
            key={`general-memo-${selectedDateKey}`}
            defaultValue={generalMemosByDate[selectedDateKey] || ""}
            onBlur={(e) => {
              const val = e.target.value;
              setGeneralMemosByDate(prev => ({
                ...prev,
                [selectedDateKey]: val
              }));
            }}
          />

          <div className="panelHeader"><div className="panelTitle">出欠確認</div></div>
          <div className="listGridWrapper">
            {membersList.map(m => (
              <div key={m.id} className="listRowCompact" style={{ flexDirection: 'column', gap: '8px' }}>
                
                {/* 1段目: 名前と出欠ボタン */}
                <div style={{ display: 'flex', width: '100%', justifyContent: 'space-between', alignItems: 'center', gap: '4px' }}>
                  {(isAdmin || isMaster) && (
                    <button type="button" className="deleteBtn" onClick={() => handleDeleteMember(m.id)} style={{ margin: 0 }}>×</button>
                  )}
                  {/* ★修正: borderBottom: 'none' を削除して下線を復活 */}
                  <input 
                    className="listNameCompact" 
                    value={names[m.id] || ""} 
                    placeholder={m.label} 
                    onChange={(e) => setNames({ ...names, [m.id]: e.target.value })} 
                    style={{ flex: 1, textAlign: 'left', paddingLeft: '4px' }}
                  />

                  <div className="listBtnsCompact">
                    {["ok", "maybe", "no"].map(type => (
                      <button 
                        key={type} 
                        className={`listBtnCompact ${type} ${status[m.id] === type ? "active" : ""}`} 
                        onClick={() => setStatusFor(m.id, type)} 
                        type="button"
                      >
                        {type === "ok" ? "○" : type === "maybe" ? "△" : "×"}
                      </button>
                    ))}
                  </div>
                </div>
                
                {/* 2段目: 一括ボタンとメモ欄 */}
                <div style={{ display: 'flex', width: '100%', alignItems: 'center', gap: '6px' }}>
                  <button
                    type="button"
                    onClick={() => setBatchModalMemberId(m.id)}
                    style={{
                      padding: '4px 10px', fontSize: '11px', background: 'var(--theme-accent2)', color: '#fff', 
                      border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', flexShrink: 0
                    }}
                  >
                    一括
                  </button>
                  <input
                    type="text"
                    className="personalMemoInput"
                    placeholder="メモを入力..."
                    key={`${m.id}-${selectedDateKey}`}
                    defaultValue={(memosByDate[selectedDateKey] || {})[m.id] || ""}
                    onBlur={(e) => {
                      const val = e.target.value;
                      setMemosByDate(prev => ({
                        ...prev,
                        [selectedDateKey]: { ...(prev[selectedDateKey] || {}), [m.id]: val }
                      }));
                    }}
                    style={{ flex: 1 }}
                  />
                </div>
              </div>
            ))}
          </div>

          {(isAdmin || isMaster) && (
            <div style={{ marginTop: '10px', textAlign: 'center' }}>
              <button type="button" className="addBtn" onClick={handleAddMember}>＋ メンバーを追加</button>
            </div>
          )}
        </div>

        <div className="section-bench">
          <div className="panelHeader"><div className="panelTitle">ベンチ（待機メンバー）</div></div>
          <div className="benchGrid">
            {benchMembers.map(m => (
              <div key={m.id} className={`benchCard status-${status[m.id]} ${selectedMemberId === m.id ? "selected-m" : ""}`} draggable onDragStart={(e) => e.dataTransfer.setData("text/memberId", m.id)} onClick={() => setSelectedMemberId(m.id === selectedMemberId ? null : m.id)}>
                <div className="benchName">{names[m.id] || m.label}</div>
                <div className="benchStatus">{status[m.id] === "ok" ? "○" : "△"}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="section-pitch" style={{ flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ width: '95%', maxWidth: '600px', display: 'flex', justifyContent: 'flex-end', marginBottom: '10px' }}>
            <button className="exportBtn" onClick={handleExportImage} disabled={isExporting}>
              {isExporting ? "⏳ 処理中..." : "📸 画像として書き出す"}
            </button>
          </div>

          <div className="pitchWrap" id="pitch-export-area">
            <div className="pitch">
              <div className="lineLayer">
                <div className="outerLine" /><div className="halfLine" /><div className="centerCircle" /><div className="centerSpot" />
                <div className="penTop" /><div className="sixTop" /><div className="spotTop" /><div className="penBottom" /><div className="sixBottom" /><div className="spotBottom" />
              </div>
              {slots.map((s) => {
                const mId = placedBySlot[s.id];
                const st = mId ? status[mId] || "none" : "none";
                const hasImage = mId && memberImages[mId];

                return (
                  <div key={s.id} className={`posSlot slot-${st} ${selectedMemberId ? "waiting-drop" : ""}`} 
                    style={{ 
                      left: `${s.x}%`, top: `${s.y}%`,
                      // ★追加：画像があれば背景に設定
                      backgroundImage: hasImage ? `url(${memberImages[mId]})` : 'none',
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                      border: hasImage ? `3px solid ${st === 'ok' ? 'var(--theme-accent1)' : 'var(--theme-accent2)'}` : ''
                    }}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => placeMember(e.dataTransfer.getData("text/memberId"), s.id)}
                    onClick={() => { if (selectedMemberId) placeMember(selectedMemberId, s.id); else if (mId) removeFromSlot(s.id); }}
                  >
                    
                    {/* ★役割（ST, CBなど）のバッジ。画像がある場合は左上に浮かせる */}
                    <div className="posRole" style={hasImage ? {
                      position: 'absolute', top: '-6px', left: '-10px',
                      background: 'var(--theme-main)', padding: '2px 4px',
                      borderRadius: '4px', zIndex: 20, border: '1px solid #fff'
                    } : {}}>
                      {s.role}
                    </div>

                    {/* ★名前タグ。画像がある場合はアイコンの下にぶら下げる */}
                    {mId ? (
                      <button className={`posName status-${st}`} type="button"
                        style={hasImage ? {
                          position: 'absolute', bottom: '-14px', left: '50%', transform: 'translateX(-50%)',
                          width: '64px', zIndex: 20
                        } : {}}
                      >
                        {names[mId] || membersList.find(x => x.id === mId)?.label || "NAME"}
                      </button>
                    ) : (
                      <div className="posEmpty">DROP</div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="section-formation">
           <div className="panelHeader" style={{ borderBottom: `2px solid var(--theme-main)`, marginBottom: '15px', paddingBottom: '10px' }}>
              <div className="panelTitle" style={{ fontWeight: 'bold' }}>フォーメーション変更</div>
           </div>
           <select 
             className="select" 
             value={currentFormation} 
             onChange={(e) => setFormationByDate(prev => ({ ...prev, [selectedDateKey]: e.target.value }))}
           >
             {keys.map(k => <option key={k} value={k}>{k}</option>)}
           </select>
        </div>

      </div>

      {/* 週間一括入力用のモーダル */}
      {batchModalMemberId && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000,
          display: 'flex', justifyContent: 'center', alignItems: 'center'
        }} onClick={() => setBatchModalMemberId(null)}>
          <div style={{
            background: 'var(--theme-bg)', padding: '20px', borderRadius: '12px',
            width: '90%', maxWidth: '350px', boxShadow: '0 10px 25px rgba(0,0,0,0.2)'
          }} onClick={e => e.stopPropagation()}>
            <h3 style={{ marginTop: 0, color: 'var(--theme-main)', textAlign: 'center', borderBottom: '1px solid var(--theme-accent2)', paddingBottom: '10px' }}>
              {names[batchModalMemberId] || 'Member'} <span style={{fontSize:'14px', fontWeight:'normal'}}>の週間出欠</span>
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '15px' }}>
              {currentWeekDates.map(d => {
                const k = toKey(d);
                const st = (statusByDate[k] || {})[batchModalMemberId];
                const WEEKS = ["日", "月", "火", "水", "木", "金", "土"];
                const isSat = d.getDay() === 6;
                const isSun = d.getDay() === 0;
                return (
                  <div key={k} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{
                      fontWeight: 'bold', fontSize: '14px',
                      color: isSun ? 'var(--theme-accent1)' : isSat ? 'var(--theme-accent2)' : 'var(--theme-main)'
                    }}>
                      {d.getMonth()+1}/{d.getDate()} ({WEEKS[d.getDay()]})
                    </div>
                    <div className="listBtnsCompact" style={{ width: '130px' }}>
                      {["ok", "maybe", "no"].map(type => (
                        <button
                          key={type}
                          className={`listBtnCompact ${type} ${st === type ? "active" : ""}`}
                          onClick={() => {
                            setStatusByDate(prev => {
                              const dayData = { ...(prev[k] || {}) };
                              if (dayData[batchModalMemberId] === type) {
                                delete dayData[batchModalMemberId]; 
                              } else {
                                dayData[batchModalMemberId] = type;
                              }
                              return { ...prev, [k]: dayData };
                            });
                          }}
                          type="button"
                        >
                          {type === "ok" ? "○" : type === "maybe" ? "△" : "×"}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            <button
              onClick={() => setBatchModalMemberId(null)}
              style={{
                width: '100%', padding: '10px', marginTop: '20px',
                background: 'var(--theme-main)', color: '#fff', border: 'none',
                borderRadius: '8px', fontWeight: 'bold', fontSize: '16px', cursor: 'pointer'
              }}
            >
              完了
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
