import { useEffect, useMemo, useState } from "react";
import { initializeApp } from "firebase/app";
import { getDatabase, ref, onValue, set, remove, get, update } from "firebase/database";
import { FORMATIONS } from "./formations";
import html2canvas from "html2canvas";
import "./App.css";

// ------------------------------------------
// Firebase設定キー (fcmanager-ff1fd)
// ------------------------------------------
const firebaseConfig = {
  apiKey: "AIzaSyDo5cjW-NLN2VvISK0y-95uTYSi3i5zBMM",
  authDomain: "fcmanager-ff1fd.firebaseapp.com",
  projectId: "fcmanager-ff1fd",
  storageBucket: "fcmanager-ff1fd.firebasestorage.app",
  messagingSenderId: "938142530767",
  appId: "1:938142530767:web:6021b0456aac2a9a0f0bba"
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
  label: `選手 ${i + 1}`,
}));

const ADMIN_CODE_DEFAULT = "1234";
const ENTRY_CODE_DEFAULT = "0000";

const DEFAULT_COLORS = {
  main: "#2c3e50",    
  accent1: "#3498db", 
  accent2: "#f1c40f", 
  bg: "#ffffff",      
  pageBg: "#f8f9fa"   
};

// ==========================================
// ★ガードマン機能（初回のみパスワード要求）
// ==========================================
export default function App() {
  const urlParams = new URLSearchParams(window.location.search);
  const TEAM_ID = urlParams.get('id'); 

  const [isVip, setIsVip] = useState(false);
  const [statusMsg, setStatusMsg] = useState("認証中...");
  
  const [isAuth, setIsAuth] = useState(() => localStorage.getItem(`auth_${TEAM_ID}`) === "true");
  const [inputPass, setInputPass] = useState("");
  
  const [dbAdminCode, setDbAdminCode] = useState(ADMIN_CODE_DEFAULT);
  const [dbEntryCode, setDbEntryCode] = useState(ENTRY_CODE_DEFAULT);

  useEffect(() => {
    if (!TEAM_ID) {
      setStatusMsg("URLが正しくありません。\n専用のURL（?id=チーム名）からアクセスしてください。");
      return;
    }

    const vipRef = ref(db, `allowedTeams/${TEAM_ID}`);
    onValue(vipRef, (snapshot) => {
      if (snapshot.exists() && String(snapshot.val()) === "true") {
        setIsVip(true); 
        
        get(ref(db, `teamsData_${TEAM_ID}`)).then((snap) => {
          if (snap.exists()) {
            const data = snap.val();
            if (data.adminCode) setDbAdminCode(data.adminCode);
            if (data.entryCode) setDbEntryCode(data.entryCode);
          }
        });
      } else {
        setStatusMsg("このクラブはまだ登録されていません。\n管理者に正しいURLをご確認ください。");
      }
    });
  }, [TEAM_ID]);

  const handleLogin = (e) => {
    e.preventDefault();
    if (inputPass === dbEntryCode || inputPass === dbAdminCode || inputPass === "5963") {
      localStorage.setItem(`auth_${TEAM_ID}`, "true");
      setIsAuth(true);
    } else {
      alert("合言葉が違います！");
    }
  };

  if (!isVip) {
    return (
      <div style={{ display: 'flex', height: '100vh', justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8f9fa', color: '#2c3e50', textAlign: 'center', padding: '20px', lineHeight: '1.6' }}>
        <div style={{ background: 'white', padding: '30px', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', maxWidth: '400px' }}>
          <h2 style={{ color: '#3498db', marginTop: 0 }}>Access Error</h2>
          <div style={{ whiteSpace: 'pre-wrap', fontWeight: 'bold', fontSize: '14px' }}>{statusMsg}</div>
        </div>
      </div>
    );
  }

  if (!isAuth) {
    return (
      <div style={{ display: 'flex', height: '100vh', justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8f9fa', color: '#2c3e50', textAlign: 'center', padding: '20px' }}>
        <div style={{ background: 'white', padding: '30px', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', width: '100%', maxWidth: '320px' }}>
          <h3 style={{ marginTop: 0, color: '#3498db' }}>FC MANAGER</h3>
          <p style={{ fontSize: '13px', color: '#666', marginBottom: '20px' }}>チームの合言葉を入力してください</p>
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <input 
              type="password" 
              placeholder="****" 
              value={inputPass}
              onChange={(e) => setInputPass(e.target.value)}
              style={{ padding: '12px', fontSize: '18px', textAlign: 'center', borderRadius: '6px', border: '1px solid #ccc', letterSpacing: '4px' }}
            />
            <button type="submit" style={{ padding: '12px', backgroundColor: '#3498db', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', fontSize: '16px' }}>入室する</button>
          </form>
        </div>
      </div>
    );
  }

  return <ClubApp teamId={TEAM_ID} />;
}

// ==========================================
// アプリ本体
// ==========================================
function ClubApp({ teamId }) {
  const DB_PATH = `teamsData_${teamId}/`; 

  const keys = FORMATIONS ? Object.keys(FORMATIONS) : ["3-4-2-1"];
  
  const [membersList, setMembersList] = useState(INITIAL_MEMBERS);
  const [formationByDate, setFormationByDate] = useState({});
  const [defaultFormation, setDefaultFormation] = useState(keys[0] || "3-4-2-1");
  const [teamName, setTeamName] = useState("新規クラブ");
  const [logoDataUrl, setLogoDataUrl] = useState("");
  const [memberImages, setMemberImages] = useState({});

  const [themeMain, setThemeMain] = useState(DEFAULT_COLORS.main);
  const [themeAccent1, setThemeAccent1] = useState(DEFAULT_COLORS.accent1);
  const [themeAccent2, setThemeAccent2] = useState(DEFAULT_COLORS.accent2);
  const [themeBg, setThemeBg] = useState(DEFAULT_COLORS.bg);
  const [themePageBg, setThemePageBg] = useState(DEFAULT_COLORS.pageBg); 
  
  const [isAdmin, setIsAdmin] = useState(() => localStorage.getItem(`role_${teamId}`) === 'admin');
  const [isMaster, setIsMaster] = useState(() => localStorage.getItem(`role_${teamId}`) === 'master');
  
  const [adminCode, setAdminCode] = useState(ADMIN_CODE_DEFAULT);
  const [entryCode, setEntryCode] = useState(ENTRY_CODE_DEFAULT);

  // ★追加：デフォルト活動設定（"active":原則有, "inactive":原則無, "pending":原則未）
  const [defaultActivityState, setDefaultActivityState] = useState("active");
  // ★追加：日付ごとの活動設定 { "2026-08-16": "active" | "inactive" | "pending" }
  const [activityByDate, setActivityByDate] = useState({});

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
  const [showWeeklyTable, setShowWeeklyTable] = useState(false);

  // ★追加：指定日の活動状態を取得するヘルパー関数
  const getActivityState = (dateKey) => {
    return activityByDate[dateKey] || defaultActivityState || "active";
  };

  // ★追加：活動状態のワンタップ切り替え処理 (active -> inactive -> pending -> active)
  const handleToggleActivity = (dateKey, e) => {
    if (e) e.stopPropagation(); // 日付選択の誤作動を防止
    if (!isAdmin && !isMaster) return; // 管理者のみ操作可能

    const current = getActivityState(dateKey);
    let next = "active";
    if (current === "active") next = "inactive";
    else if (current === "inactive") next = "pending";
    else if (current === "pending") next = "active";

    setActivityByDate(prev => ({ ...prev, [dateKey]: next }));
  };

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
    const dbRef = ref(db, DB_PATH);
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
        if (data.entryCode) setEntryCode(data.entryCode);
        
        if (data.defaultActivityState) setDefaultActivityState(data.defaultActivityState);
        if (data.activityByDate) setActivityByDate(data.activityByDate);

        if (data.membersList && Array.isArray(data.membersList)) {
          setMembersList(data.membersList);
        }
        
        if (data.generalMemosByDate) setGeneralMemosByDate(data.generalMemosByDate);
        if (data.memberImages) setMemberImages(data.memberImages);
        if (data.themeMain) setThemeMain(data.themeMain);
        if (data.themeAccent1) setThemeAccent1(data.themeAccent1);
        if (data.themeAccent2) setThemeAccent2(data.themeAccent2);
        if (data.themeBg) setThemeBg(data.themeBg);
        if (data.themePageBg) setThemePageBg(data.themePageBg); 
      }
      setIsLoaded(true);
    });
    return () => unsubscribe();
  }, [DB_PATH]);

  useEffect(() => {
    document.title = `${teamName} | 出欠・フォーメーション`;
  }, [teamName]);

  useEffect(() => {
    if (!isLoaded) return;
    const timerId = setTimeout(() => {
      const dbRef = ref(db, DB_PATH);
      
      const payload = {
        teamName, defaultFormation, adminCode, entryCode, membersList,
        themeMain, themeAccent1, themeAccent2, themeBg, themePageBg, defaultActivityState,
        names: Object.keys(names).length > 0 ? names : null,
        formationByDate: Object.keys(formationByDate).length > 0 ? formationByDate : null,
        statusByDate: Object.keys(statusByDate).length > 0 ? statusByDate : null,
        memosByDate: Object.keys(memosByDate).length > 0 ? memosByDate : null,
        placedBySlotByDate: Object.keys(placedBySlotByDate).length > 0 ? placedBySlotByDate : null,
        generalMemosByDate: Object.keys(generalMemosByDate).length > 0 ? generalMemosByDate : null,
        activityByDate: Object.keys(activityByDate).length > 0 ? activityByDate : null,
      };

      update(dbRef, payload).catch(err => console.error("保存エラー:", err));
    }, 1000);
    
    return () => clearTimeout(timerId);
  }, [teamName, names, formationByDate, defaultFormation, statusByDate, memosByDate, placedBySlotByDate, adminCode, entryCode, membersList, generalMemosByDate, themeMain, themeAccent1, themeAccent2, themeBg, themePageBg, defaultActivityState, activityByDate, isLoaded, DB_PATH]);

  useEffect(() => {
    document.body.style.backgroundColor = themePageBg;
  }, [themePageBg]);

  const handleLogoChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const MAX_SIZE = 300;
        let width = img.width;
        let height = img.height;
        if (width > height) { if (width > MAX_SIZE) { height *= MAX_SIZE / width; width = MAX_SIZE; } } 
        else { if (height > MAX_SIZE) { width *= MAX_SIZE / height; height = MAX_SIZE; } }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL("image/png");
        setLogoDataUrl(dataUrl);
        update(ref(db, DB_PATH), { logoDataUrl: dataUrl });
      };
      img.src = ev.target.result;
    };
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
    // オフ・未定の日は登録不可
    if (getActivityState(selectedDateKey) !== "active") return;

    setStatusByDate((prev) => {
      const currentDay = prev[selectedDateKey] || {};
      const currentVal = currentDay[id]; 
      const newDay = { ...currentDay };
      if (currentVal === val) { delete newDay[id]; } else { newDay[id] = val; }
      return { ...prev, [selectedDateKey]: newDay };
    });
  };

  const handleAddMember = () => {
    const newId = `m${Date.now()}`;
    setMembersList([...membersList, { id: newId, label: `選手` }]);
  };

  const handleDeleteMember = (id) => {
    if (window.confirm("このメンバーを削除しますか？")) {
      setMembersList(membersList.filter(m => m.id !== id));
      setMemberImages(prev => { const next = { ...prev }; delete next[id]; return next; });
      update(ref(db, `${DB_PATH}memberImages`), { [id]: null });
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
            setIsExporting(false); return;
          }
        } catch (e) { console.log("Share API error:", e); }
      }
      const link = document.createElement("a");
      link.href = dataUrl; link.download = `formation_${selectedDateKey}.png`;
      document.body.appendChild(link); link.click(); document.body.removeChild(link);
    } catch (e) { alert("画像の生成に失敗しました。"); } finally { setIsExporting(false); }
  };

  const benchMembers = membersList.filter(m => (status[m.id] === "ok" || status[m.id] === "maybe") && !Object.values(placedBySlot).includes(m.id));

  const pitchStyle = {
    backgroundColor: '#2f4f2f',
    backgroundImage: `linear-gradient(to bottom, #2f4f2f 0%, #2f4f2f 10%, #3a633a 10%, #3a633a 20%, #2f4f2f 20%, #2f4f2f 30%, #3a633a 30%, #3a633a 40%, #2f4f2f 40%, #2f4f2f 50%, #3a633a 50%, #3a633a 60%, #2f4f2f 60%, #2f4f2f 70%, #3a633a 70%, #3a633a 80%, #2f4f2f 80%, #2f4f2f 90%, #3a633a 90%, #3a633a 100%)`
  };

  // ★週間集計（活動の「有・無・未」切替を組み込み）
  function WeeklySummary({ currentKey, statusByDate, onSelectDate, membersCount, onOpenTable }) {
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
      const actState = getActivityState(key);
  
      weekData.push({ date: d, key, ok, maybe, no, unknown, actState });
    }
  
    const WEEKS = ["月", "火", "水", "木", "金", "土", "日"];
  
    return (
      <div className="summaryCard">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', padding: '0 4px' }}>
          <div className="summaryTitle" style={{ marginBottom: 0 }}>
            週間集計 ({toKey(monday).slice(5).replace('-', '/')} 〜)
          </div>
          <button 
            onClick={onOpenTable} 
            style={{ 
              background: 'var(--theme-accent1)', color: '#fff', border: 'none', 
              borderRadius: '6px', padding: '4px 10px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
            }}
          >
            週間一覧
          </button>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
          {weekData.map((item, idx) => {
            const isSelected = item.key === currentKey;
            const isSat = idx === 5; const isSun = idx === 6;

            // 状態に応じたスタイル・文字設定
            let badgeText = "有";
            let badgeBg = "var(--theme-accent1)";
            let cardOpacity = 1;
            let cardBorder = "1px solid transparent";

            if (item.actState === "inactive") {
              badgeText = "無";
              badgeBg = "#94a3b8";
              cardOpacity = 0.55;
            } else if (item.actState === "pending") {
              badgeText = "未";
              badgeBg = "var(--theme-accent2)";
              cardBorder = "1px dashed var(--theme-accent2)";
            }

            return (
              <div 
                key={item.key} 
                onClick={() => onSelectDate(item.key)} 
                className={`summaryDay ${isSelected ? 'selected' : ''}`}
                style={{ opacity: cardOpacity, border: cardBorder, position: 'relative' }}
              >
                <div style={{ fontWeight: 'bold', color: isSun ? 'var(--theme-accent1)' : isSat ? 'var(--theme-accent2)' : 'var(--theme-main)' }}>
                  {WEEKS[idx]} <span style={{ fontSize: '9px', fontWeight: 'normal', opacity: 0.7 }}>{item.date.getDate()}</span>
                </div>

                {/* ★有・無・未 の切り替えボタン（管理者はタップ可能） */}
                <div style={{ margin: '3px 0' }}>
                  <span 
                    onClick={(e) => handleToggleActivity(item.key, e)}
                    style={{ 
                      fontSize: '9px', background: badgeBg, color: '#fff', 
                      padding: '1px 5px', borderRadius: '4px', fontWeight: 'bold', 
                      cursor: (isAdmin || isMaster) ? 'pointer' : 'default',
                      display: 'inline-block'
                    }}
                    title={(isAdmin || isMaster) ? "タップして活動状態（有/無/未）を切替" : ""}
                  >
                    {badgeText}
                  </span>
                </div>

                <div style={{ lineHeight: '1.2' }}>
                  {item.actState === "active" ? (
                    <>
                      <div style={{ color: 'var(--theme-accent1)' }}>○ {item.ok}</div>
                      <div style={{ color: 'var(--theme-accent2)' }}>△ {item.maybe}</div>
                      <div style={{ color: 'var(--theme-main)' }}>× {item.no}</div>
                    </>
                  ) : (
                    <div style={{ color: '#64748b', fontSize: '10px', marginTop: '6px' }}>
                      {item.actState === "inactive" ? "OFF" : "未定"}
                    </div>
                  )}
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
            const actState = getActivityState(key);

            let style = {};
            if (actState === "inactive") {
              style = { opacity: 0.5, backgroundColor: '#f1f5f9' };
            } else if (actState === "pending") {
              style = { border: '1px dashed var(--theme-accent2)' };
            }
  
            return (
              <button 
                key={key} 
                type="button" 
                className={`dayCell ${isSelected ? "selected" : ""} ${isToday ? "today" : ""}`} 
                onClick={() => onSelectDate(key)}
                style={style}
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

  const selectedActivityState = getActivityState(selectedDateKey);

  return (
    <div className="page" style={{ '--theme-main': themeMain, '--theme-accent1': themeAccent1, '--theme-accent2': themeAccent2, '--theme-bg': themeBg, '--theme-page-bg': themePageBg }}>
      <header className="topbar">
        <div className="brandBar">
          <div className="logoBox">{logoDataUrl ? <img className="logoImg" src={logoDataUrl} alt="logo" /> : <div className="logoPlaceholder">LOGO</div>}</div>
          <div className="teamName">{teamName}</div>
        </div>
        <div className="controls">
          <button className="btn" type="button" onClick={() => {
            if (isAdmin || isMaster) { setIsAdmin(false); setIsMaster(false); localStorage.removeItem(`role_${teamId}`); }
            else {
              const code = window.prompt("管理者コードを入力してください");
              if (code === "5963") { setIsMaster(true); localStorage.setItem(`role_${teamId}`, 'master'); alert("マスターログイン成功"); }
              else if (code === adminCode) { setIsAdmin(true); localStorage.setItem(`role_${teamId}`, 'admin'); alert("ログイン成功"); }
              else { alert("コードが違います"); }
            }
          }}>{(isAdmin || isMaster) ? "ログアウト" : "管理者"}</button>
        </div>
      </header>

      {(isAdmin || isMaster) && (
        <div className="adminPanelMobile">
          <div className="adminField"><label className="adminLabel">チーム名設定</label><input className="textInput" key={`team-${isLoaded}`} defaultValue={teamName} onBlur={(e) => setTeamName(e.target.value)} /></div>
          <div className="adminField"><label className="adminLabel">チームロゴ変更</label><input type="file" accept="image/*" onChange={handleLogoChange} /></div>
          
          {/* ★追加：デフォルト活動設定の追加 */}
          <div className="adminField">
            <label className="adminLabel">デフォルト活動設定（基本スタンス）</label>
            <select 
              className="select" 
              value={defaultActivityState} 
              onChange={(e) => setDefaultActivityState(e.target.value)}
              style={{ fontSize: '14px', height: '38px', textAlign: 'left', paddingLeft: '10px' }}
            >
              <option value="active">原則「有（活動日）」</option>
              <option value="inactive">原則「無（オフ）」</option>
              <option value="pending">原則「未（未定）」</option>
            </select>
          </div>

          <div className="adminField">
            <label className="adminLabel" style={{ color: 'var(--theme-accent1)' }}>🔑 パスワード設定</label>
            <div style={{ background: 'rgba(0,0,0,0.05)', padding: '10px', borderRadius: '8px', marginTop: '5px' }}>
              <div style={{ marginBottom: '8px' }}>
                <span style={{ fontSize: '11px', display: 'block', color: '#666', fontWeight: 'bold' }}>管理パスコード（代表者用）</span>
                <input className="textInput" type="text" key={`admin-${isLoaded}`} defaultValue={adminCode} onBlur={(e) => setAdminCode(e.target.value)} style={{ borderColor: 'var(--theme-accent1)' }} />
              </div>
              <div>
                <span style={{ fontSize: '11px', display: 'block', color: '#666', fontWeight: 'bold' }}>入室パスコード（選手用・初回のみ）</span>
                <input className="textInput" type="text" key={`entry-${isLoaded}`} defaultValue={entryCode} onBlur={(e) => setEntryCode(e.target.value)} />
              </div>
              <div style={{ fontSize: '10px', color: '#999', marginTop: '6px' }}>※変更すると自動で保存されます</div>
            </div>
          </div>

          <div className="adminField">
            <label className="adminLabel">チームカラー設定</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '5px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}><span className="colorHint">1. メイン（ヘッダー・×・文字）</span><input type="color" value={themeMain} onChange={(e) => setThemeMain(e.target.value)} /></div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}><span className="colorHint">2. アクセント1（〇・日曜・強調）</span><input type="color" value={themeAccent1} onChange={(e) => setThemeAccent1(e.target.value)} /></div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}><span className="colorHint">3. アクセント2（△・土曜・枠線）</span><input type="color" value={themeAccent2} onChange={(e) => setThemeAccent2(e.target.value)} /></div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}><span className="colorHint">4. 背景１（カード等の土台）</span><input type="color" value={themeBg} onChange={(e) => setThemeBg(e.target.value)} /></div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}><span className="colorHint">5. 背景２（一番外側）</span><input type="color" value={themePageBg} onChange={(e) => setThemePageBg(e.target.value)} /></div>
            </div>
          </div>
          <div className="adminField"><label className="adminLabel">初期フォーメーション</label><select className="select" value={defaultFormation} onChange={(e) => setDefaultFormation(e.target.value)}>{keys.map(k => <option key={k} value={k}>{k}</option>)}</select></div>
          
          <div className="adminField" style={{ marginTop: '10px' }}>
            <label className="adminLabel">メンバーアイコン画像設定</label>
            <div style={{ padding: '10px', background: '#fff', borderRadius: '8px', border: '1px solid #ddd' }}>
              {membersList.map(m => (
                <div key={`img-${m.id}`} style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingBottom: '8px', borderBottom: '1px solid #eee', marginBottom: '8px' }}>
                  <span style={{ fontSize: '13px', width: '80px', minWidth: '80px', flexShrink: 0, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', color: 'var(--theme-main)', fontWeight: 'bold' }}>{names[m.id] || m.label}</span>
                  <input type="file" accept="image/*" style={{ flex: 1, minWidth: 0, fontSize: '11px', padding: 0, border: 'none' }} onChange={(e) => {
                    const file = e.target.files[0]; if (!file) return;
                    const reader = new FileReader();
                    reader.onload = (ev) => {
                      const img = new Image(); img.onload = () => {
                        const canvas = document.createElement("canvas"); const size = 120; canvas.width = size; canvas.height = size; const ctx = canvas.getContext("2d");
                        const min = Math.min(img.width, img.height); const sx = (img.width - min) / 2; const sy = (img.height - min) / 2;
                        ctx.drawImage(img, sx, sy, min, min, 0, 0, size, size); const dataUrl = canvas.toDataURL("image/jpeg", 0.7);
                        setMemberImages(prev => ({ ...prev, [m.id]: dataUrl }));
                        update(ref(db, `${DB_PATH}memberImages`), { [m.id]: dataUrl });
                      }; img.src = ev.target.result;
                    }; reader.readAsDataURL(file);
                  }} />
                  {memberImages[m.id] && <img src={memberImages[m.id]} alt="icon" style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover', border: '1px solid var(--theme-accent2)' }} />}
                  {memberImages[m.id] && <button type="button" onClick={() => { if(window.confirm('画像を削除しますか？')) { setMemberImages(prev => { const n = {...prev}; delete n[m.id]; return n; }); update(ref(db, `${DB_PATH}memberImages`), { [m.id]: null }); } }} style={{ background: 'var(--theme-main)', color: '#fff', padding: '4px 8px', borderRadius: '4px', fontSize: '10px' }}>削除</button>}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="layout">
        <div className="section-calendar">
          <Calendar monthDate={monthDate} selectedKey={selectedDateKey} onSelectDate={setSelectedDateKey} onPrev={() => setMonthDate(addMonths(monthDate, -1))} onNext={() => setMonthDate(addMonths(monthDate, 1))} generalMemosByDate={generalMemosByDate} />
          <WeeklySummary currentKey={selectedDateKey} statusByDate={statusByDate} onSelectDate={setSelectedDateKey} membersCount={membersList.length} onOpenTable={() => setShowWeeklyTable(true)} />
        </div>
        <div className="section-list">
          <div className="panelHeader"><div className="panelTitle">全体メモ</div></div>
          <textarea className="generalMemoInput" placeholder="全体への連絡事項" key={`general-memo-${selectedDateKey}-${isLoaded}`} defaultValue={generalMemosByDate[selectedDateKey] || ""} onBlur={(e) => { setGeneralMemosByDate(prev => ({ ...prev, [selectedDateKey]: e.target.value })); }} />
          
          <div className="panelHeader" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div className="panelTitle">出欠確認</div>
            {/* 選択日の状態を表示 */}
            <div style={{ fontSize: '11px', color: selectedActivityState === 'active' ? 'var(--theme-accent1)' : '#64748b', fontWeight: 'bold' }}>
              {selectedActivityState === 'active' ? '● 活動日' : selectedActivityState === 'inactive' ? 'OFF（活動なし）' : '❓ 日程未定'}
            </div>
          </div>

          {/* ★活動が無/未定の場合は案内を表示 */}
          {selectedActivityState !== 'active' && (
            <div style={{ background: 'rgba(0,0,0,0.05)', padding: '12px', borderRadius: '8px', textAlign: 'center', fontSize: '12px', color: '#64748b', marginBottom: '10px', fontWeight: 'bold' }}>
              {selectedActivityState === 'inactive' ? '本日はオフ（活動なし）のため出欠入力はできません' : '本日は日程未定のため出欠入力はできません'}
            </div>
          )}

          <div className="listGridWrapper" style={{ opacity: selectedActivityState === 'active' ? 1 : 0.6 }}>
            {membersList.map(m => (
              <div key={m.id} className="listRowCompact" style={{ flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', width: '100%', justifyContent: 'space-between', alignItems: 'center', gap: '4px' }}>
                  {(isAdmin || isMaster) && <button type="button" className="deleteBtn" onClick={() => handleDeleteMember(m.id)}>×</button>}
                  <input className="listNameCompact" key={`name-${m.id}-${isLoaded}`} defaultValue={names[m.id] || ""} placeholder={m.label} onBlur={(e) => setNames(prev => ({ ...prev, [m.id]: e.target.value }))} style={{ flex: 1, textAlign: 'left', paddingLeft: '4px' }} />
                  <div className="listBtnsCompact">
                    {["ok", "maybe", "no"].map(type => (
                      <button 
                        key={type} 
                        className={`listBtnCompact ${type} ${status[m.id] === type ? "active" : ""}`} 
                        onClick={() => setStatusFor(m.id, type)} 
                        type="button"
                        disabled={selectedActivityState !== 'active'}
                        style={{ cursor: selectedActivityState === 'active' ? 'pointer' : 'not-allowed' }}
                      >
                        {type === "ok" ? "○" : type === "maybe" ? "△" : "×"}
                      </button>
                    ))}
                  </div>
                </div>
                <div style={{ display: 'flex', width: '100%', alignItems: 'center', gap: '6px' }}>
                  <button type="button" onClick={() => setBatchModalMemberId(m.id)} style={{ padding: '4px 10px', fontSize: '11px', background: 'var(--theme-accent2)', color: '#fff', border: 'none', borderRadius: '4px', fontWeight: 'bold', flexShrink: 0 }}>一括</button>
                  <input type="text" className="personalMemoInput" placeholder="memo..." key={`${m.id}-${selectedDateKey}-${isLoaded}`} defaultValue={(memosByDate[selectedDateKey] || {})[m.id] || ""} onBlur={(e) => { setMemosByDate(prev => ({ ...prev, [selectedDateKey]: { ...(prev[selectedDateKey] || {}), [m.id]: e.target.value } })); }} style={{ flex: 1 }} />
                </div>
              </div>
            ))}
          </div>
          {(isAdmin || isMaster) && <div style={{ marginTop: '10px', textAlign: 'center' }}><button type="button" className="addBtn" onClick={handleAddMember}>＋ メンバーを追加</button></div>}
        </div>
        <div className="section-bench">
          <div className="panelHeader"><div className="panelTitle">ベンチ</div></div>
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
          <div style={{ width: '95%', maxWidth: '600px', display: 'flex', justifyContent: 'flex-end', marginBottom: '10px' }}><button className="exportBtn" onClick={handleExportImage} disabled={isExporting}>{isExporting ? "⏳ 処理中..." : "書き出す"}</button></div>
          <div className="pitchWrap" id="pitch-export-area">
            <div className="pitch" style={pitchStyle}>
              <div className="lineLayer">
                <div className="outerLine" /><div className="halfLine" /><div className="centerCircle" /><div className="centerSpot" /><div className="penTop" /><div className="sixTop" /><div className="spotTop" /><div className="penBottom" /><div className="sixBottom" /><div className="spotBottom" />
              </div>
              {slots.map((s) => {
                const mId = placedBySlot[s.id]; const st = mId ? status[mId] || "none" : "none"; const hasImage = mId && memberImages[mId];
                return (
                  <div key={s.id} className={`posSlot slot-${st} ${selectedMemberId ? "waiting-drop" : ""}`} style={{ left: `${s.x}%`, top: `${s.y}%`, border: hasImage ? `2px solid ${st === 'ok' ? 'var(--theme-accent1)' : 'var(--theme-accent2)'}` : '' }} onDragOver={(e) => e.preventDefault()} onDrop={(e) => placeMember(e.dataTransfer.getData("text/memberId"), s.id)} onClick={() => { if (selectedMemberId) placeMember(selectedMemberId, s.id); else if (mId) removeFromSlot(s.id); }}>
                    {hasImage && <img src={memberImages[mId]} alt="icon" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover', zIndex: 1 }} />}
                    <div className="posRole" style={hasImage ? { position: 'absolute', top: '-8px', left: '-12px', background: 'var(--theme-main)', padding: '2px 4px', borderRadius: '4px', zIndex: 10, border: '1px solid #fff', fontSize: '9px' } : { zIndex: 10 }}>{s.role}</div>
                    {mId ? <div style={{ ...(hasImage ? { position: 'absolute', bottom: '-14px', left: '50%', transform: 'translateX(-50%)' } : { marginTop: '2px' }), width: 'max-content', minWidth: '45px', maxWidth: '80px', zIndex: 10, padding: '3px 6px', fontSize: '10.5px', fontWeight: 'bold', borderRadius: '10px', boxShadow: '0 3px 6px rgba(0,0,0,0.6)', background: 'rgba(0, 0, 0, 0.65)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)', border: `1px solid ${st === 'ok' ? 'var(--theme-accent1)' : st === 'maybe' ? 'var(--theme-accent2)' : 'rgba(255,255,255,0.4)'}`, color: '#ffffff', textShadow: '0 1px 2px rgba(0,0,0,0.9)', textAlign: 'center', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{names[mId] || membersList.find(x => x.id === mId)?.label || "NAME"}</div> : <div className="posEmpty" style={{ zIndex: 10 }}>DROP</div>}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
        <div className="section-formation"><div className="panelHeader" style={{ borderBottom: `2px solid var(--theme-main)`, marginBottom: '15px', paddingBottom: '10px' }}><div className="panelTitle" style={{ fontWeight: 'bold' }}>フォーメーション</div></div><select className="select" value={currentFormation} onChange={(e) => setFormationByDate(prev => ({ ...prev, [selectedDateKey]: e.target.value }))}>{keys.map(k => <option key={k} value={k}>{k}</option>)}</select></div>
      </div>

      {/* 個人用の一括入力モーダル */}
      {batchModalMemberId && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center' }} onClick={() => setBatchModalMemberId(null)}>
          <div style={{ background: 'var(--theme-bg)', padding: '20px', borderRadius: '12px', width: '90%', maxWidth: '350px', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }} onClick={e => e.stopPropagation()}>
            <h3 style={{ marginTop: 0, color: 'var(--theme-main)', textAlign: 'center', borderBottom: '1px solid var(--theme-accent2)', paddingBottom: '10px' }}>{names[batchModalMemberId] || '選手'} 週間出欠</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '15px' }}>
              {currentWeekDates.map(d => {
                const k = toKey(d); 
                const st = (statusByDate[k] || {})[batchModalMemberId]; 
                const WEEKS = ["日", "月", "火", "水", "木", "金", "土"];
                const actState = getActivityState(k);

                return (
                  <div key={k} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', opacity: actState === 'active' ? 1 : 0.5 }}>
                    <div style={{ fontWeight: 'bold', fontSize: '14px', color: d.getDay() === 0 ? 'var(--theme-accent1)' : d.getDay() === 6 ? 'var(--theme-accent2)' : 'var(--theme-main)' }}>
                      {d.getMonth()+1}/{d.getDate()} ({WEEKS[d.getDay()]})
                      {actState !== 'active' && <span style={{ fontSize: '10px', color: '#94a3b8', marginLeft: '4px' }}>({actState === 'inactive' ? 'OFF' : '未定'})</span>}
                    </div>
                    <div className="listBtnsCompact" style={{ width: '130px' }}>
                      {["ok", "maybe", "no"].map(type => (
                        <button 
                          key={type} 
                          className={`listBtnCompact ${type} ${st === type ? "active" : ""}`} 
                          disabled={actState !== 'active'}
                          onClick={() => { 
                            if (actState !== 'active') return;
                            setStatusByDate(prev => { 
                              const dayData = { ...(prev[k] || {}) }; 
                              if (dayData[batchModalMemberId] === type) { delete dayData[batchModalMemberId]; } 
                              else { dayData[batchModalMemberId] = type; } 
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
            <button onClick={() => setBatchModalMemberId(null)} style={{ width: '100%', padding: '10px', marginTop: '20px', background: 'var(--theme-main)', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', fontSize: '16px' }}>完了</button>
          </div>
        </div>
      )}

      {/* 週間一覧表モーダル */}
      {showWeeklyTable && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center' }} onClick={() => setShowWeeklyTable(false)}>
          <div style={{ background: 'var(--theme-bg)', padding: '15px 10px', borderRadius: '12px', width: '96%', maxWidth: '800px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }} onClick={e => e.stopPropagation()}>
            <h3 style={{ marginTop: 0, color: 'var(--theme-main)', textAlign: 'center', borderBottom: '1px solid var(--theme-accent2)', paddingBottom: '10px', fontSize: '16px' }}>週間出欠一覧</h3>
            
            <div style={{ overflowX: 'auto', marginTop: '10px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', textAlign: 'center', color: 'var(--theme-main)' }}>
                <thead>
                  <tr>
                    <th style={{ borderBottom: '2px solid color-mix(in srgb, var(--theme-main) 20%, transparent)', padding: '6px 2px', whiteSpace: 'nowrap' }}>名前</th>
                    {currentWeekDates.map(d => {
                      const isSat = d.getDay() === 6;
                      const isSun = d.getDay() === 0;
                      const WEEKS = ["日", "月", "火", "水", "木", "金", "土"];
                      const actState = getActivityState(toKey(d));

                      return (
                        <th key={toKey(d)} style={{ borderBottom: '2px solid color-mix(in srgb, var(--theme-main) 20%, transparent)', padding: '6px 2px', color: isSun ? 'var(--theme-accent1)' : isSat ? 'var(--theme-accent2)' : 'inherit', whiteSpace: 'nowrap', opacity: actState === 'active' ? 1 : 0.5 }}>
                          {d.getMonth()+1}/{d.getDate()}<br />({WEEKS[d.getDay()]})
                          {actState !== 'active' && <div style={{ fontSize: '9px', color: '#94a3b8' }}>{actState === 'inactive' ? 'OFF' : '未定'}</div>}
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {membersList.map(m => (
                    <tr key={m.id}>
                      <td style={{ borderBottom: '1px solid color-mix(in srgb, var(--theme-main) 10%, transparent)', padding: '8px 2px', textAlign: 'left', fontWeight: 'bold', whiteSpace: 'nowrap', maxWidth: '75px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {names[m.id] || m.label}
                      </td>
                      {currentWeekDates.map(d => {
                        const dateKey = toKey(d);
                        const actState = getActivityState(dateKey);
                        const st = (statusByDate[dateKey] || {})[m.id];
                        
                        let mark = "-";
                        let color = "color-mix(in srgb, var(--theme-main) 30%, transparent)";

                        if (actState === 'active') {
                          if (st === "ok") { mark = "○"; color = "var(--theme-accent1)"; }
                          else if (st === "maybe") { mark = "△"; color = "var(--theme-accent2)"; }
                          else if (st === "no") { mark = "×"; color = "var(--theme-main)"; }
                        } else {
                          mark = actState === 'inactive' ? "ー" : "？";
                          color = "#cbd5e1";
                        }

                        return (
                          <td key={dateKey} style={{ borderBottom: '1px solid color-mix(in srgb, var(--theme-main) 10%, transparent)', padding: '8px 2px', color, fontWeight: 'bold', fontSize: '13px' }}>
                            {mark}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <button onClick={() => setShowWeeklyTable(false)} style={{ width: '100%', padding: '10px', marginTop: '20px', background: 'var(--theme-main)', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', fontSize: '15px', cursor: 'pointer' }}>閉じる</button>
          </div>
        </div>
      )}
    </div>
  );
}
