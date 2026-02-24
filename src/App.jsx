import { useEffect, useMemo, useState } from "react";
import { initializeApp } from "firebase/app";
import { getDatabase, ref, set, onValue } from "firebase/database";
import { FORMATIONS } from "./formations";
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
    <div style={{ marginTop: '10px', padding: '8px 4px', background: '#f9f9f9', borderRadius: '8px', border: '1px solid #ddd' }}>
      <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#555', marginBottom: '5px', textAlign: 'center' }}>
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
              style={{ 
                flex: 1, 
                textAlign: 'center', 
                border: isSelected ? '2px solid #ca9e45' : '1px solid transparent',
                borderRadius: '6px',
                padding: '4px 0',
                background: isSelected ? '#fff' : 'transparent',
                color: '#333',
                cursor: 'pointer' 
              }}
            >
              <div style={{ fontWeight: 'bold', color: isSun ? '#e03e3e' : isSat ? '#3e7ae0' : '#333' }}>
                {WEEKS[idx]} <span style={{ fontSize: '9px', fontWeight: 'normal', color: '#888' }}>{item.date.getDate()}</span>
              </div>
              <div style={{ marginTop: '4px', lineHeight: '1.2' }}>
                <div style={{ color: '#2f8f2f' }}>○ {item.ok}</div>
                <div style={{ color: '#d4a306' }}>△ {item.maybe}</div>
                <div style={{ color: '#cf4342' }}>× {item.no}</div>
                <div style={{ color: '#888' }}>- {item.unknown}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ★変更：引数に generalMemosByDate を追加
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
          
          // ★追加：その日に全体メモが存在するかどうかを判定
          const hasMemo = generalMemosByDate[key] && generalMemosByDate[key].trim() !== "";

          return (
            <button
              key={key}
              type="button"
              className={`dayCell ${isSelected ? "selected" : ""} ${isToday ? "today" : ""}`}
              onClick={() => onSelectDate(key)}
            >
              {d.getDate()}
              {/* ★追加：メモがあればドットを表示 */}
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
  
  // ★追加：全体メモの状態管理
  const [generalMemosByDate, setGeneralMemosByDate] = useState({});
  
  const [isLoaded, setIsLoaded] = useState(false);

  const currentFormation = formationByDate[selectedDateKey] || defaultFormation || keys[0];
  const status = statusByDate[selectedDateKey] || {};
  const placedBySlot = placedBySlotByDate[selectedDateKey] || {};
  const slots = useMemo(() => FORMATIONS[currentFormation] ?? [], [currentFormation]);

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
        
        // ★追加：全体メモを読み込み
        if (data.generalMemosByDate) setGeneralMemosByDate(data.generalMemosByDate);
      }
      setIsLoaded(true);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!isLoaded) return;
    const dbRef = ref(db, 'teamData/');
    set(dbRef, {
      teamName, 
      logoDataUrl, 
      names, 
      formationByDate, 
      defaultFormation, 
      statusByDate, 
      memosByDate, 
      placedBySlotByDate, 
      adminCode,
      membersList,
      generalMemosByDate // ★追加：全体メモを保存
    });
  }, [teamName, logoDataUrl, names, formationByDate, defaultFormation, statusByDate, memosByDate, placedBySlotByDate, adminCode, membersList, generalMemosByDate, isLoaded]);

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
    }
  };

  const benchMembers = membersList.filter(m => (status[m.id] === "ok" || status[m.id] === "maybe") && !Object.values(placedBySlot).includes(m.id));

  return (
    <div className="page">
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
            <label className="adminLabel">全体デフォルトフォーメーション</label>
            <select className="select" value={defaultFormation} onChange={(e) => setDefaultFormation(e.target.value)}>
              {keys.map(k => <option key={k} value={k}>{k}</option>)}
            </select>
          </div>
          <div className="adminField">
            <label className="adminLabel" style={{ color: '#ca9e45' }}>管理者パスコード変更</label>
            <input className="textInput" type="text" value={adminCode} onChange={(e) => setAdminCode(e.target.value)} style={{ border: '1px solid #ca9e45' }} />
          </div>
        </div>
      )}

      <div className="layout">
        
        {/* 1. カレンダー */}
        <div className="section-calendar">
          {/* ★変更：Calendarに generalMemosByDate を渡す */}
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

        {/* 2. 全体メモ ＆ 出欠リスト */}
        <div className="section-list">
          
          {/* ★追加：全体メモ欄（出欠リストのすぐ上に配置） */}
          <div className="panelHeader"><div className="panelTitle">全体メモ</div></div>
          <textarea
            className="generalMemoInput"
            placeholder="全体への連絡事項（時間・場所など）..."
            key={`general-memo-${selectedDateKey}`}
            defaultValue={generalMemosByDate[selectedDateKey] || ""}
            onBlur={(e) => {
              const val = e.target.value;
              setGeneralMemosByDate(prev => ({
                ...prev,
                [selectedDateKey]: val
              }));
            }}
            style={{ marginBottom: '20px' }} // 下の出欠確認との余白
          />

          <div className="panelHeader"><div className="panelTitle">出欠確認</div></div>
          <div className="listGridWrapper">
            {membersList.map(m => (
              <div key={m.id} className="listRowCompact" style={{ flexDirection: 'column', height: 'auto', padding: '8px', gap: '5px' }}>
                <div style={{ display: 'flex', width: '100%', justifyContent: 'space-between', alignItems: 'center' }}>
                  
                  {(isAdmin || isMaster) && (
                    <button 
                      type="button" 
                      onClick={() => handleDeleteMember(m.id)}
                      style={{ 
                        background: '#cf4342', color: '#fff', border: 'none', borderRadius: '4px', 
                        width: '20px', height: '20px', fontSize: '10px', marginRight: '5px', cursor: 'pointer'
                      }}
                    >
                      ×
                    </button>
                  )}

                  <input className="listNameCompact" value={names[m.id] || ""} placeholder={m.label} onChange={(e) => setNames({ ...names, [m.id]: e.target.value })} />
                  <div className="listBtnsCompact">
                    {["ok", "maybe", "no"].map(type => (
                      <button 
                        key={type} 
                        className={`listBtnCompact ${type} ${status[m.id] === type ? "active" : ""}`} 
                        onClick={() => setStatusFor(m.id, type)} 
                        type="button"
                        style={{ width: '24px', height: '40px', fontSize: '18px' }}
                      >
                        {type === "ok" ? "○" : type === "maybe" ? "△" : "×"}
                      </button>
                    ))}
                  </div>
                </div>
                <input
                  type="text"
                  placeholder="memo..."
                  key={`${m.id}-${selectedDateKey}`}
                  defaultValue={(memosByDate[selectedDateKey] || {})[m.id] || ""}
                  onBlur={(e) => {
                    const val = e.target.value;
                    setMemosByDate(prev => ({
                      ...prev,
                      [selectedDateKey]: { ...(prev[selectedDateKey] || {}), [m.id]: val }
                    }));
                  }}
                  style={{ width: '100%', boxSizing: 'border-box', padding: '4px', borderRadius: '4px', border: '1px solid #c4b6a6', background: '#fff', color: '#3e3226', fontSize: '12px' }}
                />
              </div>
            ))}
          </div>

          {(isAdmin || isMaster) && (
            <div style={{ marginTop: '15px', textAlign: 'center' }}>
              <button 
                type="button" 
                onClick={handleAddMember}
                style={{ 
                  background: '#2f4f2f', color: '#fff', border: 'none', borderRadius: '6px', 
                  padding: '8px 16px', fontSize: '14px', cursor: 'pointer', fontWeight: 'bold', width: '100%'
                }}
              >
                ＋ メンバーを追加
              </button>
            </div>
          )}
        </div>

        {/* 3. ベンチ */}
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

        {/* フォーメーション選択 */}
        <div className="section-formation" style={{ background: '#e8e2d2', padding: '15px', borderRadius: '12px', border: '1px solid #c4b6a6', boxShadow: '0 2px 5px rgba(62, 50, 38, 0.1)' }}>
           <div className="panelHeader" style={{ borderBottom: '2px solid #9a2c2e', marginBottom: '15px', paddingBottom: '10px' }}>
              <div className="panelTitle" style={{ color: '#3e3226', fontWeight: 'bold' }}>フォーメーション変更</div>
           </div>
           <select 
             className="select" 
             style={{ width: '100%', maxWidth: '100%', cursor: 'pointer', background: '#fff', color: '#3e3226', border: '1px solid #c4b6a6' }}
             value={currentFormation} 
             onChange={(e) => setFormationByDate(prev => ({ ...prev, [selectedDateKey]: e.target.value }))}
           >
             {keys.map(k => <option key={k} value={k}>{k}</option>)}
           </select>
        </div>

        {/* 4. ピッチ */}
        <div className="section-pitch" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div className="pitchWrap">
            <div className="pitch">
              <div className="lineLayer">
                <div className="outerLine" /><div className="halfLine" /><div className="centerCircle" /><div className="centerSpot" />
                <div className="penTop" /><div className="sixTop" /><div className="spotTop" /><div className="penBottom" /><div className="sixBottom" /><div className="spotBottom" />
              </div>
              {slots.map((s) => {
                const mId = placedBySlot[s.id];
                const st = mId ? status[mId] || "none" : "none";
                return (
                  <div key={s.id} className={`posSlot slot-${st} ${selectedMemberId ? "waiting-drop" : ""}`} style={{ left: `${s.x}%`, top: `${s.y}%` }}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => placeMember(e.dataTransfer.getData("text/memberId"), s.id)}
                    onClick={() => { if (selectedMemberId) placeMember(selectedMemberId, s.id); else if (mId) removeFromSlot(s.id); }}>
                    <div className="posRole">{s.role}</div>
                    {mId ? <button className={`posName status-${st}`} type="button">{names[mId] || MEMBERS.find(x => x.id === mId)?.label || "NAME"}</button> : <div className="posEmpty">DROP</div>}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
