import { useEffect, useMemo, useState } from "react";
import { FORMATIONS } from "./formations";
import "./App.css";
// ===== Share (URL) helpers =====
const SHARE_PARAM = "s"; // location.hash に #s=... として入れる

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
  // #s=xxxxx 形式
  const m = h.match(new RegExp(`${SHARE_PARAM}=([^&]+)`));
  return m ? m[1] : "";
};

const writeShareTokenToHash = (token) => {
  // 余計な履歴を増やさない
  const newHash = `#${SHARE_PARAM}=${token}`;
  history.replaceState(null, "", newHash);
};

// ロゴをURLに入れるので小さく圧縮（128px）
const downscaleImageToDataUrl = (file, size = 128, quality = 0.85) =>
  new Promise((resolve, reject) => {
    if (!file || !file.type.startsWith("image/")) return reject(new Error("not image"));
    const img = new Image();
    const reader = new FileReader();

    reader.onload = () => {
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d");
        ctx.clearRect(0, 0, size, size);

        // 正方形に中央トリミング
        const s = Math.min(img.width, img.height);
        const sx = (img.width - s) / 2;
        const sy = (img.height - s) / 2;
        ctx.drawImage(img, sx, sy, s, s, 0, 0, size, size);

        // PNGより軽いことが多いので JPEG にする
        const out = canvas.toDataURL("image/jpeg", quality);
        resolve(out);
      };
      img.onerror = reject;
      img.src = reader.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
const MEMBERS = Array.from({ length: 20 }, (_, i) => ({
  id: `m${i + 1}`,
  label: `Member ${i + 1}`,
}));
// ===== Club settings (localStorage) =====
const SETTINGS_KEY = "fc_lineup_settings_v1";

// ここだけ好きな管理者コードに変えてOK（例: "matiz11"）
const ADMIN_CODE = "1234";
// ===== Calendar helpers =====
const toKey = (d) => {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};
const monthStart = (d) => new Date(d.getFullYear(), d.getMonth(), 1);
const monthEnd = (d) => new Date(d.getFullYear(), d.getMonth() + 1, 0);
const addMonths = (d, n) => new Date(d.getFullYear(), d.getMonth() + n, 1);

function Calendar({ monthDate, selectedKey, onSelectDate, onPrev, onNext }) {
  const start = monthStart(monthDate);
  const end = monthEnd(monthDate);

  // 月曜始まり
  const startDow = (start.getDay() + 6) % 7; // Sun(0)->6, Mon(1)->0
  const daysInMonth = end.getDate();

  const cells = [];
  for (let i = 0; i < startDow; i++) cells.push(null);
  for (let day = 1; day <= daysInMonth; day++) {
    cells.push(new Date(monthDate.getFullYear(), monthDate.getMonth(), day));
  }
  while (cells.length % 7 !== 0) cells.push(null);

  const title = `${monthDate.getFullYear()}-${String(
    monthDate.getMonth() + 1
  ).padStart(2, "0")}`;

  const dows = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const todayKey = toKey(new Date());

  return (
    <div className="calendarCard">
      <div className="calendarHeader">
        <button className="navBtn" onClick={onPrev} type="button">‹</button>
        <div className="calendarTitle">{title}</div>
        <button className="navBtn" onClick={onNext} type="button">›</button>
      </div>

      <div className="calendarDow">
        {dows.map((x) => (
          <div key={x} className="dowCell">{x}</div>
        ))}
      </div>

      <div className="calendarGrid">
        {cells.map((d, idx) => {
          if (!d) return <div key={idx} className="dayCell empty" />;
          const key = toKey(d);
          const isSel = key === selectedKey;
          const isToday = key === todayKey;
          return (
            <button
              key={key}
              type="button"
              className={`dayCell ${isSel ? "selected" : ""} ${isToday ? "today" : ""}`}
              onClick={() => onSelectDate(key)}
              title={key}
            >
              {d.getDate()}
            </button>
          );
        })}
      </div>

      <div className="calendarHint">日付で「その日の出欠・配置」に切り替え</div>
    </div>
  );
}

export default function App() {
  const keys = Object.keys(FORMATIONS);
  const [formation, setFormation] = useState(keys[0] || "3-4-2-1");
  // ===== club settings =====
  const [teamName, setTeamName] = useState("TEAM NAME");
  const [logoDataUrl, setLogoDataUrl] = useState(""); // base64 data url
 const [isAdmin, setIsAdmin] = useState(false);
  // これを追加
  const [selectedMemberId, setSelectedMemberId] = useState(null);

  // 初回ロード：保存済み設定を読む
  useEffect(() => {
    try {
      const raw = localStorage.getItem(SETTINGS_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw);
      if (typeof saved.teamName === "string") setTeamName(saved.teamName);
      if (typeof saved.logoDataUrl === "string") setLogoDataUrl(saved.logoDataUrl);
    } catch {
      // 失敗しても無視（壊れてても画面が死なないように）
    }
  }, []);

  // 変更があったら保存
  useEffect(() => {
    try {
      localStorage.setItem(
        SETTINGS_KEY,
        JSON.stringify({ teamName, logoDataUrl })
      );
    } catch {
      // 容量不足などは無視
    }
  }, [teamName, logoDataUrl]);

  const unlockAdmin = () => {
    const code = window.prompt("管理者コードを入力");
    if (code === ADMIN_CODE) setIsAdmin(true);
    else window.alert("コードが違います");
  };

  const lockAdmin = () => setIsAdmin(false);

 const onPickLogo = async (file) => {
  try {
    const dataUrl = await downscaleImageToDataUrl(file, 128, 0.85);
    setLogoDataUrl(dataUrl);
  } catch (e) {
    window.alert("画像ファイルを選んでください");
  }
};
  // 名前（memberId -> name）
  const [names, setNames] = useState({});
  const setName = (id, value) => setNames((prev) => ({ ...prev, [id]: value }));

  // 出欠（memberId -> ok|maybe|no|none）
 // ===== 日付選択 =====
const [monthDate, setMonthDate] = useState(() => new Date());
const [selectedDateKey, setSelectedDateKey] = useState(() => toKey(new Date()));

// ===== 日付ごとに保存する =====
// statusByDate[dateKey][memberId] = ok|maybe|no|none
const [statusByDate, setStatusByDate] = useState({});
// placedBySlotByDate[dateKey][slotId] = memberId
const [placedBySlotByDate, setPlacedBySlotByDate] = useState({});

// 今選んでる日付のデータ
const status = statusByDate[selectedDateKey] || {};
const placedBySlot = placedBySlotByDate[selectedDateKey] || {};

const setStatusFor = (id, value) => {
  setStatusByDate((prev) => {
    const day = { ...(prev[selectedDateKey] || {}) };
    day[id] = value;
    return { ...prev, [selectedDateKey]: day };
  });
};

  // 配置（slotId -> memberId）
 

  const slots = useMemo(() => FORMATIONS[formation] ?? [], [formation]);
// ===== URL共有から復元（最優先） =====
useEffect(() => {
  const token = readShareTokenFromHash();
  if (!token) return;

  try {
    const data = decodeShare(token);

    // club
    if (typeof data.teamName === "string") setTeamName(data.teamName);
    if (typeof data.logoDataUrl === "string") setLogoDataUrl(data.logoDataUrl);

    // selected date
    if (typeof data.selectedDateKey === "string") setSelectedDateKey(data.selectedDateKey);

    // names（任意：共有したいので復元）
    if (data.names && typeof data.names === "object") setNames(data.names);

    // day data（試験運用：選択中の日付1日分だけ）
    if (data.dayKey && typeof data.dayKey === "string") {
      const dayKey = data.dayKey;

      if (data.statusDay && typeof data.statusDay === "object") {
        setStatusByDate((prev) => ({ ...prev, [dayKey]: data.statusDay }));
      }
      if (data.placedDay && typeof data.placedDay === "object") {
        setPlacedBySlotByDate((prev) => ({ ...prev, [dayKey]: data.placedDay }));
      }
    }
  } catch (e) {
    console.warn("share decode failed", e);
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, []);
  // 置かれてるmemberId
  const placedMemberIds = useMemo(() => {
    return new Set(Object.values(placedBySlot).filter(Boolean));
  }, [placedBySlot]);

  // ベンチ：○/△ で、まだ置かれてない人
  const benchMembers = useMemo(() => {
    return MEMBERS.filter((m) => {
      const st = status[m.id];
      const eligible = st === "ok" || st === "maybe";
      return eligible && !placedMemberIds.has(m.id);
    });
  }, [status, placedMemberIds]);

 const resetPitch = () =>
  setPlacedBySlotByDate((prev) => ({ ...prev, [selectedDateKey]: {} }));

  const onDragStartMember = (ev, memberId) => {
    ev.dataTransfer.setData("text/memberId", memberId);
    ev.dataTransfer.effectAllowed = "move";
  };

  const allowDrop = (ev) => {
    // スマホとPC共通で使える「配置」の命令
  const placeMember = (memberId, slotId) => {
    if (!memberId) return;
    const st = (statusByDate[selectedDateKey] || {})[memberId];
    if (!(st === "ok" || st === "maybe")) return;

    setPlacedBySlotByDate((prev) => {
      const nextDay = { ...(prev[selectedDateKey] || {}) };
      // 重複削除
      for (const k of Object.keys(nextDay)) {
        if (nextDay[k] === memberId) delete nextDay[k];
      }
      nextDay[slotId] = memberId;
      return { ...prev, [selectedDateKey]: nextDay };
    });
    setSelectedMemberId(null); // 配置したら選択解除
  };
    ev.preventDefault();
    ev.dataTransfer.dropEffect = "move";
  };

  const onDropToSlot = (ev, slotId) => {
    ev.preventDefault();
    const memberId = ev.dataTransfer.getData("text/memberId");
    if (!memberId) return;

    // ○/△以外は置かない（ベンチ経由なら基本来ないけど保険）
    const st = status[memberId];
    if (!(st === "ok" || st === "maybe")) return;

    setPlacedBySlotByDate((prev) => {
  const nextDay = { ...(prev[selectedDateKey] || {}) };

  // 同じ人が別枠にいたら外す
  for (const k of Object.keys(nextDay)) {
    if (nextDay[k] === memberId) delete nextDay[k];
  }
  nextDay[slotId] = memberId;

  return { ...prev, [selectedDateKey]: nextDay };
});
  };

  const removeFromSlot = (slotId) => {
   setPlacedBySlotByDate((prev) => {
  const nextDay = { ...(prev[selectedDateKey] || {}) };
  delete nextDay[slotId];
  return { ...prev, [selectedDateKey]: nextDay };
});
  };

  const displayName = (memberId) => {
    const n = (names[memberId] || "").trim();
    if (n) return n;
    const m = MEMBERS.find((x) => x.id === memberId);
    return m?.label || "NAME";
  };
  // ===== Share link (URL) =====
  const buildShareLink = () => {
    // 試験運用：選択中の日付だけ共有（URLが長くなりすぎるのを防ぐ）
    const dayKey = selectedDateKey;

    const payload = {
      v: 1,
      teamName,
      logoDataUrl,
      selectedDateKey,
      dayKey,
      names,
      statusDay: statusByDate[dayKey] || {},
      placedDay: placedBySlotByDate[dayKey] || {},
    };

    const token = encodeShare(payload);

    // ★ここは確実にURLが変わる方法にする
    location.hash = `#${SHARE_PARAM}=${token}`;

    return `${location.origin}${location.pathname}${location.hash}`;
  };

  const copyShareLink = async () => {
    try {
      const url = buildShareLink();

      try {
        await navigator.clipboard.writeText(url);
        window.alert("共有リンクをコピーしました（Discordに貼ってOK）");
      } catch {
        window.prompt("コピーできない場合はこれを手動コピー", url);
      }
    } catch (e) {
      window.alert("共有リンク作成でエラー: " + (e?.message || e));
      console.error(e);
    }
  };

  return (
    <div className="page">
     <header className="topbar">
  <div className="brandBar">
    <div className="brandLeft">
      <div className="logoBox">
        {logoDataUrl ? (
          <img className="logoImg" src={logoDataUrl} alt="club logo" />
        ) : (
          <div className="logoPlaceholder">LOGO</div>
        )}
      </div>

      <div className="teamBlock">
        <div className="teamName">{teamName}</div>
        <div className="teamSub">Lineup / Attendance</div>
      </div>
    </div>

    <div className="brandRight">
      {!isAdmin ? (
        <button className="btn ghost" type="button" onClick={unlockAdmin}>
          管理者
        </button>
      ) : (
        <button className="btn ghost" type="button" onClick={lockAdmin}>
          管理者OFF
        </button>
      )}
    </div>
  </div>

  <div className="controls">
    {/* 管理者だけ編集UIを出す */}
    {isAdmin && (
      <div className="adminControls">
        <label className="label">
          チーム名
          <input
            className="textInput"
            value={teamName}
            onChange={(e) => setTeamName(e.target.value)}
            placeholder="TEAM NAME"
          />
        </label>
<button className="btn ghost" type="button" onClick={copyShareLink}>
  共有リンク
</button>
        <label className="label">
          ロゴ
          <input
            className="fileInput"
            type="file"
            accept="image/*"
            onChange={(e) => onPickLogo(e.target.files?.[0])}
          />
        </label>

        {logoDataUrl && (
          <button
            className="btn ghost"
            type="button"
            onClick={() => setLogoDataUrl("")}
            title="ロゴを消す"
          >
            ロゴ削除
          </button>
        )}
      </div>
    )}

    {/* ここから下は “あなたの既存” をそのまま残す */}
    <label className="label">
      Formation
      <select
        className="select"
        value={formation}
        onChange={(e) => setFormation(e.target.value)}
      >
        {keys.map((k) => (
          <option key={k} value={k}>
            {k}
          </option>
        ))}
      </select>
    </label>

    <button className="btn ghost" type="button" onClick={resetPitch}>
      ピッチ配置をリセット
    </button>

   <button className="btn" type="button" onClick={copyShareLink}>
  共有リンクを保存
</button>
  </div>
</header>
      <div className="layout">
        {/* Calendar */}
<aside className="calendar">
  <section className="panel">
    <div className="panelHeader">
      <div className="panelTitle">カレンダー</div>
      <div className="panelHint">選択日：{selectedDateKey}</div>
    </div>

    <div style={{ padding: 12 }}>
      <Calendar
        monthDate={monthDate}
        selectedKey={selectedDateKey}
        onSelectDate={setSelectedDateKey}
        onPrev={() => setMonthDate((d) => addMonths(d, -1))}
        onNext={() => setMonthDate((d) => addMonths(d, 1))}
      />
    </div>
  </section>
</aside>
        {/* Pitch */}
        <main className="stage">
          <div className="pitchWrap">
            <div className="pitch">
              {/* lines */}
              <div className="lineLayer" aria-hidden="true">
                <div className="outerLine" />
                <div className="halfLine" />
                <div className="centerCircle" />
                <div className="centerSpot" />

                <div className="penTop" />
                <div className="sixTop" />
                <div className="spotTop" />

                <div className="penBottom" />
                <div className="sixBottom" />
                <div className="spotBottom" />
              </div>

              {/* slots */}
              {slots.map((s) => {
                const memberId = placedBySlot[s.id];
                const st = memberId ? status[memberId] || "none" : "none";
                return (
                  <div
                    key={s.id}
                    className={`posSlot slot-${st}`}
                    style={{ left: `${s.x}%`, top: `${s.y}%` }}
                    onDragOver={allowDrop}
                    onDrop={(ev) => onDropToSlot(ev, s.id)}
                    title="ベンチからドラッグで配置"
                  >
                    <div className="posRole">{s.role}</div>
                    onClick={() => {
    if (selectedMemberId) {
      placeMember(selectedMemberId, s.id);
    } else if (memberId) {
      removeFromSlot(s.id);
    }
  }}

                    {memberId ? (
                      <button
                        type="button"
                        className={`posName status-${st}`}
                        onClick={() => removeFromSlot(s.id)}
                        title="クリックで外してベンチに戻す"
                      >
                        {displayName(memberId)}
                      </button>
                    ) : (
                      <div className="posEmpty">DROP</div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="footerNote">Modern • Dark • Clean</div>
          </div>
        </main>

        {/* Side */}
        <aside className="side">
          {/* Bench */}
          <section className="panel">
            <div className="panelHeader">
              <div className="panelTitle">ベンチ（○ / △）</div>
              <div className="panelHint">ここからドラッグ → ピッチへ</div>
            </div>

            <div className="benchGrid">
              {benchMembers.length === 0 ? (
                <div className="emptyNote">
                  ○ / △ を選ぶとここに出る（未配置の人）
                </div>
              ) : (
                benchMembers.map((m) => (
                  <div
                    key={m.id}
                    className={`benchCard status-${status[m.id] || "none"}`}
                    draggable
                    onDragStart={(ev) => onDragStartMember(ev, m.id)}
                    title="ドラッグしてピッチへ"
                    onClick={() => {
    setSelectedMemberId(m.id === selectedMemberId ? null : m.id);
  }}
                  >
                    <div className="benchName">{displayName(m.id)}</div>
                    <div className="benchStatus">
                      {status[m.id] === "ok" ? "○" : "△"}
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          {/* List */}
          <section className="panel">
            <div className="panelHeader">
              <div className="panelTitle">出欠一覧（○ / △ / ×）</div>
              <div className="panelHint">○/△ → ベンチに出る</div>
            </div>

            <div className="listRows">
              {MEMBERS.map((m) => (
                <div key={m.id} className="listRow">
                  <input
                    className={`listName status-${status[m.id] || "none"}`}
                    value={names[m.id] || ""}
                    placeholder={m.label}
                    onChange={(e) => setName(m.id, e.target.value)}
                  />

                  <div className="listBtns">
                    <button
                      type="button"
                      className={`listBtn ok ${status[m.id] === "ok" ? "active" : ""}`}
                      onClick={() => setStatusFor(m.id, "ok")}
                    >
                      ○
                    </button>
                    <button
                      type="button"
                      className={`listBtn maybe ${status[m.id] === "maybe" ? "active" : ""}`}
                      onClick={() => setStatusFor(m.id, "maybe")}
                    >
                      △
                    </button>
                    <button
                      type="button"
                      className={`listBtn no ${status[m.id] === "no" ? "active" : ""}`}
                      onClick={() => setStatusFor(m.id, "no")}
                    >
                      ×
                    </button>
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
