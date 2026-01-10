import { useEffect, useMemo, useState } from "react";
import { FORMATIONS } from "./formations";
import "./App.css";

// --- Helpers ---
const SHARE_PARAM = "s";
const toBase64Url = (uint8) => {
  let binary = "";
  uint8.forEach((b) => (binary += String.fromCharCode(b)));
  const b64 = btoa(binary);
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
};
const fromBase64Url = (b64url) => {
  const b64 = b64url.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((b64url.length + 3) % 4);
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
};
const encodeShare = (obj) => {
  const json = JSON.stringify(obj);
  const bytes = new TextEncoder().encode(json);
  return toBase64Url(bytes);
};
const decodeShare = (token) => {
  const bytes = fromBase64Url(token);
  const json = new TextDecoder().decode(bytes);
  return JSON.parse(json);
};
const readShareTokenFromHash = () => {
  const h = location.hash || "";
  const m = h.match(new RegExp(`${SHARE_PARAM}=([^&]+)`));
  return m ? m[1] : "";
};
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
const SETTINGS_KEY = "fc_lineup_settings_v1";
const ADMIN_CODE = "1234";

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

  // --- 1. Stateの定義（ここをセットで入れ替え） ---
  const [formationByDate, setFormationByDate] = useState({}); // 日付ごとの記録
  const [defaultFormation, setDefaultFormation] = useState(keys[0] || "3-4-2-1"); // 管理者が決める基本形
  const [teamName, setTeamName] = useState("TEAM NAME");
  const [logoDataUrl, setLogoDataUrl] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [isMaster, setIsMaster] = useState(false); // マスター権限フラグ
  const [adminCode, setAdminCode] = useState("1234"); // 管理者パスコード（初期値）
  const [selectedMemberId, setSelectedMemberId] = useState(null);
  const [names, setNames] = useState({});
  const [monthDate, setMonthDate] = useState(() => new Date());
  const [selectedDateKey, setSelectedDateKey] = useState(() => toKey(new Date()));
  const [statusByDate, setStatusByDate] = useState({});
  const [placedBySlotByDate, setPlacedBySlotByDate] = useState({});

  // --- 2. 表示するフォーメーションを決めるロジック ---
  // 「今日の設定」がなければ「管理者のデフォルト」、それもなければ「リストの1番目」
  const currentFormation = formationByDate[selectedDateKey] || defaultFormation || keys[0];
  const status = statusByDate[selectedDateKey] || {};
  const placedBySlot = placedBySlotByDate[selectedDateKey] || {};
  const slots = useMemo(() => FORMATIONS[currentFormation] ?? [], [currentFormation]);

  // --- 3. 読み込みと保存（エラーが出ないように補完） ---
  useEffect(() => {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) {
      try {
        const saved = JSON.parse(raw);
        if (saved.teamName) setTeamName(saved.teamName);
        if (saved.logoDataUrl) setLogoDataUrl(saved.logoDataUrl);
        if (saved.names) setNames(saved.names || {});
        if (saved.formationByDate) setFormationByDate(saved.formationByDate);
        if (saved.defaultFormation) setDefaultFormation(saved.defaultFormation); // これを読み込む
        if (saved.statusByDate) setStatusByDate(saved.statusByDate || {});
        if (saved.placedBySlotByDate) setPlacedBySlotByDate(saved.placedBySlotByDate || {});
      } catch (e) { console.error("Load error:", e); }
    }
  }, []);

  useEffect(() => {
    const dataToSave = {
      teamName, logoDataUrl, names,
      formationByDate, defaultFormation, // これを保存する
      statusByDate, placedBySlotByDate
    };
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(dataToSave));
  }, [teamName, logoDataUrl, names, formationByDate, defaultFormation, statusByDate, placedBySlotByDate]);
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

  const buildShareLink = () => {
    const payload = { v: 1, teamName, logoDataUrl, selectedDateKey, names, dayKey: selectedDateKey, statusDay: status, placedDay: placedBySlot };
    const token = encodeShare(payload);
    location.hash = `#s=${token}`;
    return window.location.href;
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
      // すでにログイン中ならログアウトする
      setIsAdmin(false);
      setIsMaster(false);
    } else {
      const code = window.prompt("ENTER CODE");
      if (code === "5963") {
        setIsMaster(true); // マスターログイン
        alert("マスター権限でログインしました");
      } else if (code === adminCode) {
        setIsAdmin(true);  // 管理者ログイン
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
  value={currentFormation} // ここを currentFormation に
  onChange={(e) => {
    const newFormation = e.target.value;
    // 日付をキーにして保存する
    setFormationByDate(prev => ({
      ...prev,
      [selectedDateKey]: newFormation
    }));
  }}
>
  {keys.map(k => <option key={k} value={k}>{k}</option>)}
</select>
          <button className="btn" type="button" onClick={() => { navigator.clipboard.writeText(buildShareLink()); alert("URLコピー成功"); }}>共有保存</button>
        </div>
        {(isAdmin || isMaster) && (
        <div style={{ padding: '15px', background: 'rgba(255,255,255,0.05)', borderRadius: '12px', margin: '10px' }}>
          {/* チーム名設定 */}
          <div style={{ marginBottom: '15px' }}>
            <label style={{ fontSize: '12px', color: '#888', display: 'block', marginBottom: '5px' }}>チーム名設定</label>
            <input 
              className="textInput" 
              value={teamName} 
              onChange={(e) => setTeamName(e.target.value)} 
              style={{ width: '100%', padding: '8px', background: '#222', border: '1px solid #444', color: '#fff', borderRadius: '4px' }} 
            />
          </div>

          {/* デフォルトフォーメーション設定 */}
          <div style={{ marginBottom: '15px' }}>
            <label style={{ fontSize: '12px', color: '#888', display: 'block', marginBottom: '5px' }}>全体デフォルトフォーメーション</label>
            <select 
              className="select" 
              value={defaultFormation} 
              onChange={(e) => setDefaultFormation(e.target.value)}
              style={{ width: '100%', padding: '8px' }}
            >
              {keys.map(k => <option key={k} value={k}>{k}</option>)}
            </select>
          </div>

          {/* 管理者パスコード変更 */}
          <div>
            <label style={{ fontSize: '12px', color: '#ffcc00', display: 'block', marginBottom: '5px' }}>管理者パスコード変更</label>
            <input 
              className="textInput" 
              type="text" 
              value={adminCode} 
              onChange={(e) => setAdminCode(e.target.value)} 
              style={{ width: '100%', border: '1px solid #ffcc00', padding: '8px', background: '#222', color: '#fff' }}
            />
            <p style={{ fontSize: '10px', color: '#888', marginTop: '5px' }}>※マスターコード(5963)は固定です</p>
          </div>
        </div>
      )}
      </header>

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