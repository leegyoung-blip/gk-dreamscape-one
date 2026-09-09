"use client";

export type VersusMonsterChoice = {
  slug: string;
  name: string;
  rarity: string;
  sprite_url: string;
};

export type VersusPlayerChoice = {
  id: string;
  display_name: string;
  is_host: boolean;
  character_type: "nova" | "monster" | null;
  character_slug: string | null;
};

const novaChoices = [
  {
    slug: "original",
    label: "Original Nova",
    subtitle: "Classic battle suit",
    sprite: "/activities/learning-missions/knowledge-arena/nova/nova-battle-idle.png",
  },
  {
    slug: "striker",
    label: "Striker Nova",
    subtitle: "Crimson speed suit",
    sprite: "/activities/learning-missions/knowledge-arena/versus/novas/nova-striker.png",
  },
  {
    slug: "pulse",
    label: "Pulse Nova",
    subtitle: "Violet tech suit",
    sprite: "/activities/learning-missions/knowledge-arena/versus/novas/nova-pulse.png",
  },
  {
    slug: "vanguard",
    label: "Vanguard Nova",
    subtitle: "Gold guardian suit",
    sprite: "/activities/learning-missions/knowledge-arena/versus/novas/nova-vanguard.png",
  },
] as const;

const monsterOrder = [
  "atlas-golem",
  "tempest-roc",
  "worldbreaker-leviathan",
  "verdant-sabertooth",
] as const;

const novaLabelBySlug = Object.fromEntries(
  novaChoices.map((choice) => [choice.slug, choice.label]),
) as Record<string, string>;

function choiceLabel(player: VersusPlayerChoice, monsters: VersusMonsterChoice[]) {
  if (!player.character_type || !player.character_slug) return "Choosing…";
  if (player.character_type === "nova") {
    return novaLabelBySlug[player.character_slug] || "Nova";
  }
  return monsters.find((monster) => monster.slug === player.character_slug)?.name || player.character_slug;
}

export function ArenaVersusCharacterSelect({
  players,
  monsters,
  myPlayerId,
  isHost,
  working,
  message,
  onSelect,
  onStart,
}: {
  players: VersusPlayerChoice[];
  monsters: VersusMonsterChoice[];
  myPlayerId: string | null;
  isHost: boolean;
  working: boolean;
  message: string;
  onSelect: (type: "nova" | "monster", slug: string) => void;
  onStart: () => void;
}) {
  const me = players.find((player) => player.id === myPlayerId) || null;
  const orderedMonsters = monsterOrder
    .map((slug) => monsters.find((monster) => monster.slug === slug))
    .filter((monster): monster is VersusMonsterChoice => Boolean(monster));
  const selectableMonsters =
    orderedMonsters.length === 4 ? orderedMonsters : monsters.slice(0, 4);
  const allSelected = players.length >= 2 && players.every((player) => player.character_type && player.character_slug);

  return (
    <div className="kavs-select-shell">
      <div className="kavs-select-head">
        <div>
          <p>VERSUS RACE</p>
          <h2>Choose your racer</h2>
          <span>Choose one of four Nova suits or one of the four Arena monsters. Your choice changes your racer appearance only.</span>
        </div>
        <div className="kavs-ready-count">
          <strong>{players.filter((p) => p.character_type && p.character_slug).length}/{players.length}</strong>
          <span>selected</span>
        </div>
      </div>

      <div className="kavs-choice-section">
        <div className="kavs-section-title">Nova suits · 4 choices</div>
        <div className="kavs-grid kavs-nova-grid">
          {novaChoices.map((item) => {
            const selected = me?.character_type === "nova" && me.character_slug === item.slug;
            return (
              <button
                type="button"
                key={item.slug}
                className={`kavs-choice ${selected ? "is-selected" : ""}`}
                onClick={() => onSelect("nova", item.slug)}
                disabled={working}
              >
                <div className="kavs-sprite-box">
                  <img src={item.sprite} alt="" draggable={false} />
                </div>
                <strong>{item.label}</strong>
                <span>{selected ? "Selected" : item.subtitle}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="kavs-choice-section">
        <div className="kavs-section-title">Arena monsters · 4 choices</div>
        <div className="kavs-grid kavs-monster-grid">
          {selectableMonsters.map((monster) => {
            const selected = me?.character_type === "monster" && me.character_slug === monster.slug;
            return (
              <button
                type="button"
                key={monster.slug}
                className={`kavs-choice ${selected ? "is-selected" : ""}`}
                onClick={() => onSelect("monster", monster.slug)}
                disabled={working}
              >
                <div className="kavs-sprite-box">
                  <img src={monster.sprite_url} alt="" draggable={false} />
                </div>
                <strong>{monster.name}</strong>
                <span>{monster.rarity}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="kavs-roster">
        {players.map((player) => (
          <div key={player.id} className={`kavs-roster-row ${player.id === myPlayerId ? "is-me" : ""}`}>
            <strong>{player.display_name}{player.is_host ? " · Host" : ""}</strong>
            <span>{choiceLabel(player, monsters)}</span>
          </div>
        ))}
      </div>

      {message && <div className="kavs-message">{message}</div>}

      <div className="kavs-actions">
        {isHost ? (
          <button type="button" className="kavs-start" onClick={onStart} disabled={!allSelected || working}>
            {allSelected ? "Start Versus Race" : "Waiting for every player to choose"}
          </button>
        ) : (
          <div className="kavs-waiting">{me?.character_type ? "Character locked. Waiting for the host." : "Choose your racer."}</div>
        )}
      </div>

      <style jsx>{`
        .kavs-select-shell { height:100%; overflow:auto; padding:22px; color:white; background:linear-gradient(180deg,#061326,#090a18); }
        .kavs-select-head { display:flex; align-items:flex-start; justify-content:space-between; gap:18px; margin-bottom:20px; }
        .kavs-select-head p { margin:0 0 5px; color:#78e8ff; font-size:11px; font-weight:950; letter-spacing:.18em; }
        .kavs-select-head h2 { margin:0; font-size:clamp(27px,4vw,48px); line-height:1; }
        .kavs-select-head span { display:block; max-width:760px; margin-top:9px; color:rgba(255,255,255,.7); font-size:14px; }
        .kavs-ready-count { min-width:92px; border:1px solid rgba(120,232,255,.18); border-radius:18px; background:rgba(255,255,255,.05); padding:12px 14px; text-align:center; }
        .kavs-ready-count strong { display:block; font-size:24px; }
        .kavs-ready-count span { margin:0; font-size:10px; text-transform:uppercase; letter-spacing:.1em; }
        .kavs-choice-section { margin-top:16px; }
        .kavs-section-title { margin-bottom:9px; font-size:12px; font-weight:950; letter-spacing:.12em; text-transform:uppercase; color:rgba(255,255,255,.72); }
        .kavs-grid { display:grid; gap:10px; }
        .kavs-nova-grid { grid-template-columns:repeat(4,minmax(0,1fr)); }
        .kavs-monster-grid { grid-template-columns:repeat(4,minmax(0,1fr)); }
        .kavs-choice { overflow:hidden; border:1px solid rgba(255,255,255,.11); border-radius:18px; background:rgba(255,255,255,.045); padding:10px; color:white; text-align:left; transition:.18s ease; }
        .kavs-choice:hover { transform:translateY(-2px); border-color:rgba(120,232,255,.35); }
        .kavs-choice.is-selected { border-color:#78e8ff; box-shadow:0 0 0 2px rgba(120,232,255,.14),0 12px 30px rgba(0,190,255,.14); }
        .kavs-sprite-box { display:grid; height:130px; place-items:center; border-radius:13px; background:radial-gradient(circle at 50% 45%,rgba(120,232,255,.13),rgba(2,7,18,.5)); }
        .kavs-sprite-box img { width:100%; height:100%; object-fit:contain; }
        .kavs-choice strong { display:block; margin-top:8px; font-size:13px; }
        .kavs-choice span { display:block; margin-top:2px; color:rgba(255,255,255,.5); font-size:10px; text-transform:capitalize; }
        .kavs-roster { display:grid; grid-template-columns:repeat(auto-fit,minmax(190px,1fr)); gap:8px; margin-top:18px; }
        .kavs-roster-row { border:1px solid rgba(255,255,255,.1); border-radius:13px; background:rgba(255,255,255,.035); padding:9px 11px; }
        .kavs-roster-row.is-me { border-color:rgba(120,232,255,.32); }
        .kavs-roster-row strong,.kavs-roster-row span { display:block; }
        .kavs-roster-row strong { font-size:11px; }
        .kavs-roster-row span { margin-top:3px; color:rgba(255,255,255,.58); font-size:10px; }
        .kavs-message { margin-top:12px; border-radius:12px; background:rgba(255,92,92,.1); padding:10px 12px; color:#ffb6b6; font-size:12px; font-weight:800; }
        .kavs-actions { margin-top:16px; display:flex; justify-content:flex-end; }
        .kavs-start { min-width:250px; border:0; border-radius:15px; background:linear-gradient(135deg,#6be6ff,#8676ff); padding:13px 18px; color:#03111d; font-weight:950; }
        .kavs-start:disabled { opacity:.42; }
        .kavs-waiting { border:1px solid rgba(255,255,255,.1); border-radius:14px; background:rgba(255,255,255,.04); padding:11px 14px; color:rgba(255,255,255,.7); font-size:12px; }
        @media(max-width:900px){
          .kavs-select-shell{padding:12px 14px 18px}.kavs-select-head{margin-bottom:11px}.kavs-select-head span{font-size:11px}.kavs-ready-count{padding:8px 10px}.kavs-ready-count strong{font-size:18px}
          .kavs-nova-grid{grid-template-columns:repeat(4,minmax(120px,1fr));overflow-x:auto}.kavs-monster-grid{grid-template-columns:repeat(4,minmax(110px,1fr));overflow-x:auto}.kavs-sprite-box{height:90px}.kavs-choice{padding:7px;border-radius:13px}.kavs-roster{display:none}
        }
      `}</style>
    </div>
  );
}
