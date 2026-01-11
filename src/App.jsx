import { useEffect, useMemo, useState } from "react";
// ★ Firebaseの道具箱をインポート
import { initializeApp } from "firebase/app";
import { getDatabase, ref, set, onValue } from "firebase/database";
import { FORMATIONS } from "./formations";
import "./App.css";

// --- 1. Firebaseの設定 ---
const firebaseConfig = {
  apiKey: "AIzaSyCKPgR0jrOxXH2wBEBdEg-oHC7mHPZD6DM",
  authDomain: "fc-clubs-management.firebaseapp.com",
  projectId: "fc-clubs-management",
  storageBucket: "fc-clubs-management.firebasestorage.app",
  messagingSenderId: "498521204900",
  appId: "1:498521204900:web:1d27cbe0222468f82dde31"
};

// --- 2. Firebaseを起動 ---
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

const MEMBERS = Array.from({ length: 20 }, (_, i) => ({
  id: `m${i + 1}`,
  label: `Member ${i + 1}`,
}));
const ADMIN_CODE_DEFAULT = "1234";

// --- Sub Components ---
function Calendar({ monthDate, selectedKey, onSelectDate, onPrev, onNext }) {
  const start = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
  const end = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);
  const startDow = (start.getDay() + 6) % 7;
  const daysInMonth = end.getDate();
  const cells = [];
  for (let i = 0; i < startDow; i++) cells.push(null);
  for (let day = 1; day <= daysInMonth; day++) cells.push(new Date(monthDate.getFullYear(), monthDate.getMonth(), day));
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <div className="calendarCard">
      <div className="calendarHeader">
        <button className="navBtn" onClick={onPrev} type="button">‹</button>
        <div className="calendarTitle">{toKey(monthDate).substring(0, 7)}</div>
        <button className="navBtn" onClick={onNext} type="button">›</button>
      </div>
      <div className="calendarGrid">
        {cells.map((d, idx) => {
          if (!d) return <div key={idx} className="dayCell empty" />;
          const key = toKey(d);
          return (
            <button
              key={key}
              type="button"
              className={`dayCell ${key === selectedKey ? "selected" : ""} ${key === toKey(new Date()) ? "today" : ""}`}
              onClick={() => onSelectDate(key)}
            >
              {d.getDate()}
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

  // --- State定義 ---
  const [formationByDate, setFormationByDate] = useState({});
  const [defaultFormation, setDefaultFormation] = useState(keys[0] || "3-4-2-1");
  const [teamName, setTeamName] = useState("TEAM NAME");
  const [logoDataUrl, setLogoDataUrl] = useState("");
  
  // 権限管理
  const [isAdmin, setIsAdmin] = useState(false);
  const [isMaster, setIsMaster] = useState(false);
  const [adminCode, setAdminCode] = useState(ADMIN_CODE_DEFAULT);

  const [selectedMemberId, setSelectedMemberId] = useState(null);
  const [names, setNames] = useState({});
  const [monthDate, setMonthDate] = useState(() => new Date());
  const [selectedDateKey, setSelectedDateKey] = useState(() => toKey(new Date()));
  const [statusByDate, setStatusByDate] = useState({});
  const [placedBySlotByDate, setPlacedBySlotByDate] = useState({});
  
  // ★重要：データ読み込み完了フラグ
  const [isLoaded, setIsLoaded] = useState(false);

  // 現在のデータ計算
  const currentFormation = formationByDate[selectedDateKey] || defaultFormation || keys[0];
  const status = statusByDate[selectedDateKey] || {};
  const placedBySlot = placedBySlotByDate[selectedDateKey] || {};
  const slots = useMemo(() => FORMATIONS[currentFormation] ?? [], [currentFormation]);

  // --- ★ Firebase連携ロジック ---

  // 1. 読み込み
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
        if (data.placedBySlotByDate) setPlacedBySlotByDate(data.placedBySlotByDate);
        if (data.adminCode) setAdminCode(data.adminCode);
      }
      setIsLoaded(true);
    });
    return () => unsubscribe();
  }, []);

  // 2. 自動保存
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
      placedBySlotByDate,
      adminCode
    });
  }, [teamName, logoDataUrl, names, formationByDate, defaultFormation, statusByDate, placedBySlotByDate, adminCode, isLoaded]);


  // --- 操作系関数 ---
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
    setStatusByDate((p) => ({
      ...p,
      [selectedDateKey]: { ...(p[selectedDateKey] || {}), [id]: val },
    }));
  };

  const benchMembers = MEMBERS.filter(m => (status[m.id] === "ok" || status[m.id] === "maybe") && !Object.values(placedBySlot).includes(m.id));

  return (
    <div className="page">
      <header className="topbar">
        <div className="brandBar">
          <div className="brandLeft">
            <div className="logoBox">
              {logoDataUrl ? <img className="logoImg" src={logoDataUrl} alt="logo" /> : <div className="logoPlaceholder">LOGO</div>}
            </div>
            <div className="teamBlock"><div className="teamName">{teamName}</div></div>
          </div>
          <button 
            className="btn ghost" 
            type="button" 
            onClick={() => {
              if (isAdmin || isMaster) {
                setIsAdmin(false);
                setIsMaster(false);
              } else {
                const code = window.prompt("ENTER CODE");
                if (code === "5963") {
                  setIsMaster(true);
                  alert("マスター権限でログインしました");
                } else if (code === adminCode) {
                  setIsAdmin(true);
                  alert("管理者権限でログインしました");
                } else {
                  alert("コードが違います");
                }
              }
            }}
          >
            {(isAdmin || isMaster) ? "ログアウト" : "管理者"}
          </button>
        </div>
        <div className="controls">
          <select 
            className="select" 
            value={currentFormation} 
            onChange={(e) => {
              const newFormation = e.target.value;
              setFormationByDate(prev => ({
                ...prev,
                [selectedDateKey]: newFormation
              }));
            }}
          >
            {keys.map(k => <option key={k} value={k}>{k}</option>)}
          </select>
        </div>
      </header>

      {/* --- ★管理画面（スマホ対応のためヘッダーの外へ移動済み） --- */}
      {(isAdmin || isMaster) && (
        <div className="adminPanelMobile">
          <div className="adminField">
            <label className="adminLabel">チーム名設定</label>
            <input 
              className="textInput" 
              value={teamName} 
              onChange={(e) => setTeamName(e.target.value)} 
            />
          </div>

          <div className="adminField">
            <label className="adminLabel">全体デフォルトフォーメーション</label>
            <select 
              className="select" 
              value={defaultFormation} 
              onChange={(e) => setDefaultFormation(e.target.value)}
            >
              {keys.map(k => <option key={k} value={k}>{k}</option>)}
            </select>
            <p style={{ fontSize: '10px', color: '#666' }}>※まだ設定していない日の初期表示になります</p>
          </div>

          <div className="adminField">
            <label className="adminLabel" style={{ color: '#ffcc00' }}>管理者パスコード変更</label>
            <input 
              className="textInput" 
              type="text" 
              value={adminCode} 
              onChange={(e) => setAdminCode(e.target.value)} 
              style={{ border: '1px solid #ffcc00' }}
            />
            <p style={{ fontSize: '10px', color: '#666' }}>※マスターコード(5963)は固定です</p>
          </div>
        </div>
      )}

      <div className="layout">
        <aside className="calendar">
          <Calendar monthDate={monthDate} selectedKey={selectedDateKey} onSelectDate={setSelectedDateKey} onPrev={() => setMonthDate(addMonths(monthDate, -1))} onNext={() => setMonthDate(addMonths(monthDate, 1))} />
        </aside>

        <main className="stage">
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
                  <div
                    key={s.id}
                    className={`posSlot slot-${st} ${selectedMemberId ? "waiting-drop" : ""}`}
                    style={{ left: `${s.x}%`, top: `${s.y}%` }}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => placeMember(e.dataTransfer.getData("text/memberId"), s.id)}
                    onClick={() => {
                      if (selectedMemberId) placeMember(selectedMemberId, s.id);
                      else if (mId) removeFromSlot(s.id);
                    }}
                  >
                    <div className="posRole">{s.role}</div>
                    {mId ? <button className={`posName status-${st}`} type="button">{names[mId] || MEMBERS.find(x => x.id === mId)?.label || "NAME"}</button> : <div className="posEmpty">DROP</div>}
                  </div>
                );
              })}
            </div>
          </div>
        </main>

        <aside className="side">
          <section className="panel">
            <div className="panelHeader"><div className="panelTitle">ベンチ</div></div>
            <div className="benchGrid">
              {benchMembers.map(m => (
                <div 
                  key={m.id} 
                  className={`benchCard status-${status[m.id]} ${selectedMemberId === m.id ? "selected-m" : ""}`} 
                  draggable 
                  onDragStart={(e) => e.dataTransfer.setData("text/memberId", m.id)}
                  onClick={() => setSelectedMemberId(m.id === selectedMemberId ? null : m.id)}
                >
                  <div className="benchName">{names[m.id] || m.label}</div>
                  <div className="benchStatus">{status[m.id] === "ok" ? "○" : "△"}</div>
                </div>
              ))}
            </div>
          </section>

          <section className="panel">
            <div className="listRows">
              {MEMBERS.map(m => (
                <div key={m.id} className="listRow">
                  <input className="listName" value={names[m.id] || ""} placeholder={m.label} onChange={(e) => setNames({...names, [m.id]: e.target.value})} />
                  <div className="listBtns">
                    {["ok", "maybe", "no"].map(type => (
                      <button key={type} className={`listBtn ${type} ${status[m.id] === type ? "active" : ""}`} onClick={() => setStatusFor(m.id, type)} type="button">
                        {type === "ok" ? "○" : type === "maybe" ? "△" : "×"}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
