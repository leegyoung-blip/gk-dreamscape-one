"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";

const MS_PER_HOUR = 10 * 1000;
// For real launch, change the line above to:
// const MS_PER_HOUR = 60 * 60 * 1000;

const MAX_OFFLINE_HOURS = 24;

const buildSpots = [
  {
    id: "start-platform",
    name: "Start Platform",
    left: 12,
    top: 67,
    description: "Your first base inside the Evergreen Dream Tree.",
    special: false,
    availableItems: ["dream-lantern", "milos-bench"],
  },
  {
    id: "side-branch",
    name: "Side Branch",
    left: 30.7,
    top: 45,
    description: "A smaller branch for nature-based buildings.",
    special: false,
    availableItems: ["bird-sanctuary", "flower-garden"],
  },
  {
    id: "canopy-hub",
    name: "Canopy Hub",
    left: 51,
    top: 46,
    description: "A large space for powerful buildings.",
    special: false,
    availableItems: ["treehouse", "workshop"],
  },
  {
    id: "nest-branch",
    name: "Nest Branch",
    left: 56,
    top: 74,
    description: "A cozy branch for collectible-generating buildings.",
    special: false,
    availableItems: ["rare-bird-nest", "flower-garden"],
  },
  {
    id: "branch-ledge",
    name: "Branch Ledge",
    left: 73.5,
    top: 81,
    description: "A higher area for special structures.",
    special: false,
    availableItems: ["mushroom-grove", "treehouse"],
  },
  {
    id: "quiet-platform",
    name: "Quiet Platform",
    left: 88.5,
    top: 50,
    description: "A peaceful space for slower but rarer rewards.",
    special: false,
    availableItems: ["reflection-pond", "milos-bench"],
  },
  {
    id: "more-space",
    name: "Expand Your Tree",
    left: 52.5,
    top: 27,
    description: "Unlock more buildable space in your Evergreen Dream Tree.",
    special: true,
    availableItems: [],
  },
];

const buildItems = {
  "dream-lantern": {
    name: "Dream Lantern",
    icon: "🏮",
    description: "Generates Dream Crystals over time.",
    produces: "+10 Dream Crystals / hour",
    rareDrop: "Small chance to find Leaves",
    cost: 0,
    ratePerHour: 10,
  },
  "milos-bench": {
    name: "Milo's Bench",
    icon: "🪑",
    description: "A peaceful resting spot that creates Inspiration.",
    produces: "+6 Dream Crystals / hour",
    rareDrop: "Small chance to find Flowers",
    cost: 0,
    ratePerHour: 6,
  },
  "bird-sanctuary": {
    name: "Bird Sanctuary",
    icon: "🐦",
    description: "Attracts birds that bring small rewards.",
    produces: "+12 Dream Crystals / hour",
    rareDrop: "Small chance to find Feathers",
    cost: 50,
    ratePerHour: 12,
  },
  "flower-garden": {
    name: "Flower Garden",
    icon: "🌸",
    description: "A beautiful garden that slowly produces rewards.",
    produces: "+8 Dream Crystals / hour",
    rareDrop: "Small chance to find Flowers",
    cost: 40,
    ratePerHour: 8,
  },
  treehouse: {
    name: "Treehouse",
    icon: "🏡",
    description: "A major building that generates strong rewards.",
    produces: "+25 Dream Crystals / hour",
    rareDrop: "Small chance to find Leaves",
    cost: 120,
    ratePerHour: 25,
  },
  workshop: {
    name: "Workshop",
    icon: "🛠️",
    description: "Creates useful items and digital rewards.",
    produces: "+20 Dream Crystals / hour",
    rareDrop: "Small chance to find Blueprints later",
    cost: 100,
    ratePerHour: 20,
  },
  "rare-bird-nest": {
    name: "Rare Bird Nest",
    icon: "🪺",
    description: "A nest that attracts rare birds.",
    produces: "+15 Dream Crystals / hour",
    rareDrop: "Higher chance to find Feathers",
    cost: 80,
    ratePerHour: 15,
  },
  "mushroom-grove": {
    name: "Mushroom Grove",
    icon: "🍄",
    description: "A magical grove that produces slow but steady rewards.",
    produces: "+14 Dream Crystals / hour",
    rareDrop: "Small chance to find rare spores later",
    cost: 70,
    ratePerHour: 14,
  },
  "reflection-pond": {
    name: "Reflection Pond",
    icon: "💧",
    description: "A calm pond that creates rare peaceful rewards.",
    produces: "+10 Dream Crystals / hour",
    rareDrop: "Small chance to find Flowers",
    cost: 90,
    ratePerHour: 10,
  },
};

type BuildSpot = (typeof buildSpots)[number];
type BuildItemId = keyof typeof buildItems;

export default function EvergreenDreamTreePage() {
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const [userId, setUserId] = useState<string | null>(null);
  const [selectedSpot, setSelectedSpot] = useState<BuildSpot | null>(null);

  const [isDragging, setIsDragging] = useState(false);
  const [hasDragged, setHasDragged] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [scrollStart, setScrollStart] = useState({ left: 0, top: 0 });

  const [dreamCrystals, setDreamCrystals] = useState(0);

  const [resources, setResources] = useState({
    leaves: 0,
    feathers: 0,
    flowers: 0,
  });

  const [builtItems, setBuiltItems] = useState<Record<string, string>>({});
  const [lastCollected, setLastCollected] = useState<Record<string, number>>(
    {}
  );

  const [nowTick, setNowTick] = useState(Date.now());

  function getProfileKey(key: string) {
    if (!userId) return null;
    return `dream-tree:${userId}:evergreen:${key}`;
  }

  function saveProfileData(key: string, value: unknown) {
    const profileKey = getProfileKey(key);
    if (!profileKey) return;

    localStorage.setItem(profileKey, JSON.stringify(value));
  }

  useEffect(() => {
    async function loadTreeProfile() {
      const { data } = await supabase.auth.getUser();

      if (!data.user) {
        setUserId(null);
        setDreamCrystals(0);
        setResources({
          leaves: 0,
          feathers: 0,
          flowers: 0,
        });
        setBuiltItems({});
        setLastCollected({});
        return;
      }

      const currentUserId = data.user.id;
      setUserId(currentUserId);

      const prefix = `dream-tree:${currentUserId}:evergreen`;

      const savedCrystals = localStorage.getItem(`${prefix}:crystals`);
      const savedResources = localStorage.getItem(`${prefix}:resources`);
      const savedBuiltItems = localStorage.getItem(`${prefix}:built-items`);
      const savedLastCollected = localStorage.getItem(
        `${prefix}:last-collected`
      );

      const loadedBuiltItems = savedBuiltItems
        ? JSON.parse(savedBuiltItems)
        : {};

      const loadedLastCollected = savedLastCollected
        ? JSON.parse(savedLastCollected)
        : {};

      const now = Date.now();

      Object.keys(loadedBuiltItems).forEach((spotId) => {
        if (!loadedLastCollected[spotId]) {
          loadedLastCollected[spotId] = now;
        }
      });

      if (savedCrystals) {
        setDreamCrystals(JSON.parse(savedCrystals));
      } else {
        setDreamCrystals(100);
      }

      if (savedResources) {
        setResources(JSON.parse(savedResources));
      } else {
        setResources({
          leaves: 0,
          feathers: 0,
          flowers: 0,
        });
      }

      setBuiltItems(loadedBuiltItems);
      setLastCollected(loadedLastCollected);

      localStorage.setItem(
        `${prefix}:last-collected`,
        JSON.stringify(loadedLastCollected)
      );
    }

    loadTreeProfile();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setNowTick(Date.now());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  function handleMouseDown(e: React.MouseEvent<HTMLDivElement>) {
    if (!scrollRef.current) return;

    setIsDragging(true);
    setHasDragged(false);
    setStartPos({ x: e.clientX, y: e.clientY });
    setScrollStart({
      left: scrollRef.current.scrollLeft,
      top: scrollRef.current.scrollTop,
    });
  }

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    if (!isDragging || !scrollRef.current) return;

    const dx = e.clientX - startPos.x;
    const dy = e.clientY - startPos.y;

    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) {
      setHasDragged(true);
    }

    scrollRef.current.scrollLeft = scrollStart.left - dx;
    scrollRef.current.scrollTop = scrollStart.top - dy;
  }

  function handleMouseUp() {
    setIsDragging(false);
  }

  function openSpot(spot: BuildSpot) {
    if (hasDragged) return;
    setSelectedSpot(spot);
  }

  function buildItem(itemId: string) {
    if (!userId) {
      alert("Please log in to save your tree.");
      return;
    }

    if (!selectedSpot) return;

    const item = buildItems[itemId as BuildItemId];

    if (!item) return;

    if (dreamCrystals < item.cost) {
      alert("Not enough Dream Crystals yet.");
      return;
    }

    const updatedBuiltItems = {
      ...builtItems,
      [selectedSpot.id]: itemId,
    };

    const updatedCrystals = dreamCrystals - item.cost;

    const updatedLastCollected = {
      ...lastCollected,
      [selectedSpot.id]: Date.now(),
    };

    setBuiltItems(updatedBuiltItems);
    setDreamCrystals(updatedCrystals);
    setLastCollected(updatedLastCollected);

    saveProfileData("built-items", updatedBuiltItems);
    saveProfileData("crystals", updatedCrystals);
    saveProfileData("last-collected", updatedLastCollected);

    setSelectedSpot(null);
  }

  function getPendingRewards(spotId: string) {
    const itemId = builtItems[spotId];

    if (!itemId) return 0;

    const item = buildItems[itemId as BuildItemId];

    if (!item) return 0;

    const lastTime = lastCollected[spotId];

    if (!lastTime) return 0;

    const elapsedMs = nowTick - lastTime;

    const elapsedHours = Math.min(
      elapsedMs / MS_PER_HOUR,
      MAX_OFFLINE_HOURS
    );

    return Math.floor(elapsedHours * item.ratePerHour);
  }

  function getTimeUntilNextReward(spotId: string) {
    const itemId = builtItems[spotId];

    if (!itemId) return null;

    const item = buildItems[itemId as BuildItemId];

    if (!item) return null;

    const pendingRewards = getPendingRewards(spotId);

    if (pendingRewards > 0) return 0;

    const lastTime = lastCollected[spotId];

    if (!lastTime) {
      return MS_PER_HOUR / item.ratePerHour;
    }

    const msPerCrystal = MS_PER_HOUR / item.ratePerHour;
    const elapsedMs = nowTick - lastTime;

    const remainder = elapsedMs % msPerCrystal;
    const remainingMs = msPerCrystal - remainder;

    return Math.max(0, remainingMs);
  }

  function formatTimeLeft(ms: number | null) {
    if (ms === null) return "";
    if (ms <= 0) return "Ready";

    const totalSeconds = Math.ceil(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(
      2,
      "0"
    )}`;
  }

  function collectRewards() {
    if (!userId) {
      alert("Please log in to collect rewards.");
      return;
    }

    if (!selectedSpot) return;

    const itemId = builtItems[selectedSpot.id];

    if (!itemId) return;

    const item = buildItems[itemId as BuildItemId];

    if (!item) return;

    const rewardAmount = getPendingRewards(selectedSpot.id);

    if (rewardAmount <= 0) {
      alert("No rewards ready yet. Come back later!");
      return;
    }

    const updatedCrystals = dreamCrystals + rewardAmount;

    const updatedLastCollected = {
      ...lastCollected,
      [selectedSpot.id]: Date.now(),
    };

    setDreamCrystals(updatedCrystals);
    setLastCollected(updatedLastCollected);

    saveProfileData("crystals", updatedCrystals);
    saveProfileData("last-collected", updatedLastCollected);

    alert(`Collected ${rewardAmount} Dream Crystals from ${item.name}!`);
  }

  function saveProgress() {
    if (!userId) {
      alert("Please log in to save your tree.");
      return;
    }

    saveProfileData("crystals", dreamCrystals);
    saveProfileData("resources", resources);
    saveProfileData("built-items", builtItems);
    saveProfileData("last-collected", lastCollected);

    alert("Progress saved to your profile!");
  }

  return (
    <main className="page">
      <button
        className="navButton backButton"
        onClick={() => (window.location.href = "/creator")}
      >
        ← Back to Creator World
      </button>

      <div className="rightButtons">
        <button className="navButton" onClick={saveProgress}>
          Save Progress
        </button>

        <button
          className="navButton"
          onClick={() => (window.location.href = "/profile")}
        >
          My Account
        </button>
      </div>

      <div className="topBar">
        <h1>Evergreen Dream Tree</h1>
        <p>Click and drag to explore. Choose a place to build your dream.</p>
      </div>

      <div className="currencyPanel">
        <div className="currencyChip">💎 {dreamCrystals} Dream Crystals</div>
        <div className="currencyChip">🍃 {resources.leaves} Leaves</div>
        <div className="currencyChip">🪶 {resources.feathers} Feathers</div>
        <div className="currencyChip">🌸 {resources.flowers} Flowers</div>
      </div>

      <div
        ref={scrollRef}
        className={`scrollWorld ${isDragging ? "dragging" : ""}`}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <div className="worldImage">
          {buildSpots.map((spot) => {
            const builtItemId = builtItems[spot.id];
            const builtItem = builtItemId
              ? buildItems[builtItemId as BuildItemId]
              : null;

            const timeLeft = getTimeUntilNextReward(spot.id);
            const timerText = formatTimeLeft(timeLeft);
            const isReady = timeLeft === 0;

            return (
              <div
                key={spot.id}
                className="hotspotWrap"
                style={{
                  left: `${spot.left}%`,
                  top: `${spot.top}%`,
                }}
              >
                <button
                  className={`hotspot ${
                    spot.special ? "specialHotspot" : ""
                  } ${builtItem ? "builtHotspot" : ""}`}
                  onClick={() => openSpot(spot)}
                >
                  {builtItem ? builtItem.icon : "+"}
                </button>

                {builtItem && (
                  <div className={`rewardTimer ${isReady ? "ready" : ""}`}>
                    {timerText}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {selectedSpot && (
        <div className="popupBackdrop" onClick={() => setSelectedSpot(null)}>
          <div className="popup" onClick={(e) => e.stopPropagation()}>
            <button className="close" onClick={() => setSelectedSpot(null)}>
              ×
            </button>

            {selectedSpot.special ? (
              <>
                <h2>Purchase More Space</h2>
                <p>
                  Unlock a new area inside your Evergreen Dream Tree and continue
                  growing your dream ecosystem.
                </p>

                <div className="purchaseBox">
                  <h3>Extra Dream Space</h3>
                  <p>Includes one additional build location.</p>

                  <div className="price">$12.90</div>

                  <button className="purchaseButton">
                    Purchase More Space
                  </button>
                </div>
              </>
            ) : builtItems[selectedSpot.id] ? (
              <div className="builtInfo">
                {(() => {
                  const itemId = builtItems[selectedSpot.id];
                  const item = buildItems[itemId as BuildItemId];
                  const pendingRewards = getPendingRewards(selectedSpot.id);
                  const timeLeft = getTimeUntilNextReward(selectedSpot.id);

                  return (
                    <>
                      <div className="builtIcon">{item.icon}</div>
                      <h2>{item.name}</h2>
                      <p>{item.description}</p>

                      <div className="produces">{item.produces}</div>
                      <div className="rareDrop">{item.rareDrop}</div>

                      <div className="pendingRewards">
                        Ready to collect: 💎 {pendingRewards}
                      </div>

                      <div className="nextReward">
                        Next reward: {formatTimeLeft(timeLeft)}
                      </div>

                      <button
                        className="collectButton"
                        onClick={collectRewards}
                        disabled={pendingRewards <= 0}
                      >
                        Collect Rewards
                      </button>
                    </>
                  );
                })()}
              </div>
            ) : (
              <>
                <h2>{selectedSpot.name}</h2>
                <p>{selectedSpot.description}</p>

                <div className="buildGrid">
                  {selectedSpot.availableItems.map((itemId) => {
                    const item = buildItems[itemId as BuildItemId];

                    return (
                      <button key={itemId} onClick={() => buildItem(itemId)}>
                        <div className="itemTop">
                          <span>{item.icon}</span>
                          <h3>{item.name}</h3>
                        </div>

                        <p>{item.description}</p>

                        <div className="produces">{item.produces}</div>
                        <div className="rareDrop">{item.rareDrop}</div>

                        <div className="cost">
                          {item.cost === 0 ? "Free" : `💎 ${item.cost}`}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <style jsx>{`
        .page {
          width: 100vw;
          height: 100vh;
          overflow: hidden;
          background: #07150f;
          color: white;
          font-family: Arial, sans-serif;
        }

        .scrollWorld {
          width: 100vw;
          height: 100vh;
          overflow: auto;
          cursor: grab;
          user-select: none;
        }

        .scrollWorld.dragging {
          cursor: grabbing;
        }

        .worldImage {
          position: relative;
          width: 300vw;
          min-width: 3000px;
          height: auto;
          min-height: 100vh;
          aspect-ratio: 3 / 1;
          background-image: url("/activities/dream-tree/evergreen-canopy.png");
          background-size: contain;
          background-repeat: no-repeat;
          background-position: top left;
        }

        .navButton {
          padding: 12px 18px;
          border: 1px solid rgba(255, 255, 255, 0.22);
          border-radius: 999px;
          background: rgba(8, 22, 16, 0.76);
          color: white;
          font-weight: 800;
          cursor: pointer;
          backdrop-filter: blur(12px);
        }

        .navButton:hover {
          background: rgba(255, 218, 130, 0.2);
        }

        .backButton {
          position: fixed;
          top: 24px;
          left: 24px;
          z-index: 20;
        }

        .rightButtons {
          position: fixed;
          top: 24px;
          right: 24px;
          z-index: 20;
          display: flex;
          gap: 10px;
        }

        .topBar {
          position: fixed;
          top: 24px;
          left: 50%;
          transform: translateX(-50%);
          z-index: 10;
          width: min(720px, 88vw);
          padding: 18px 24px;
          border-radius: 22px;
          text-align: center;
          background: rgba(8, 22, 16, 0.72);
          border: 1px solid rgba(255, 255, 255, 0.18);
          backdrop-filter: blur(12px);
          pointer-events: none;
        }

        .topBar h1 {
          margin: 0;
          font-size: 30px;
        }

        .topBar p {
          margin: 6px 0 0;
          opacity: 0.85;
        }

        .currencyPanel {
          position: fixed;
          right: 24px;
          bottom: 24px;
          z-index: 20;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .currencyChip {
          padding: 10px 16px;
          border: 1px solid rgba(255, 255, 255, 0.22);
          border-radius: 999px;
          background: rgba(8, 22, 16, 0.76);
          color: white;
          font-weight: 800;
          backdrop-filter: blur(12px);
          white-space: nowrap;
          text-align: left;
        }

        .hotspotWrap {
          position: absolute;
          transform: translate(-50%, -50%);
          z-index: 5;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
        }

        .hotspot {
          width: 54px;
          height: 54px;
          border-radius: 999px;
          border: 2px solid rgba(255, 255, 255, 0.9);
          background: rgba(255, 208, 94, 0.85);
          color: #3a2400;
          font-size: 30px;
          font-weight: 900;
          cursor: pointer;
          box-shadow: 0 0 24px rgba(255, 220, 120, 0.8);
          transition: 0.2s ease;
        }

        .hotspot:hover {
          transform: scale(1.15);
          background: #ffe39a;
        }

        .specialHotspot {
          background: rgba(160, 255, 176, 0.9);
          color: #063b14;
          box-shadow: 0 0 30px rgba(160, 255, 176, 0.9);
        }

        .builtHotspot {
          background: rgba(185, 255, 196, 0.92);
          color: #063b14;
          box-shadow: 0 0 30px rgba(185, 255, 196, 0.9);
        }

        .rewardTimer {
          min-width: 58px;
          padding: 5px 8px;
          border-radius: 999px;
          background: rgba(8, 22, 16, 0.78);
          border: 1px solid rgba(255, 255, 255, 0.22);
          color: white;
          font-size: 11px;
          font-weight: 900;
          text-align: center;
          backdrop-filter: blur(10px);
          pointer-events: none;
        }

        .rewardTimer.ready {
          background: rgba(185, 255, 196, 0.9);
          color: #063b14;
          box-shadow: 0 0 18px rgba(185, 255, 196, 0.75);
        }

        .popupBackdrop {
          position: fixed;
          inset: 0;
          z-index: 30;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(0, 0, 0, 0.42);
          backdrop-filter: blur(4px);
        }

        .popup {
          position: relative;
          width: min(780px, 90vw);
          padding: 28px;
          border-radius: 28px;
          background: rgba(17, 25, 20, 0.94);
          border: 1px solid rgba(255, 255, 255, 0.2);
          box-shadow: 0 30px 80px rgba(0, 0, 0, 0.45);
        }

        .popup h2 {
          margin: 0 0 8px;
          font-size: 30px;
        }

        .popup p {
          margin-top: 0;
          opacity: 0.82;
        }

        .close {
          position: absolute;
          top: 18px;
          right: 18px;
          width: 38px;
          height: 38px;
          border-radius: 999px;
          border: none;
          background: rgba(255, 255, 255, 0.12);
          color: white;
          font-size: 26px;
          cursor: pointer;
        }

        .buildGrid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 14px;
          margin-top: 22px;
        }

        .buildGrid button {
          padding: 20px;
          border-radius: 20px;
          border: 1px solid rgba(255, 255, 255, 0.16);
          background: rgba(255, 255, 255, 0.08);
          color: white;
          text-align: left;
          cursor: pointer;
          transition: 0.2s ease;
        }

        .buildGrid button:hover {
          background: rgba(255, 218, 130, 0.18);
          transform: translateY(-4px);
        }

        .itemTop {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .itemTop span {
          font-size: 28px;
        }

        .itemTop h3 {
          margin: 0;
          font-size: 20px;
        }

        .produces {
          margin-top: 12px;
          font-size: 13px;
          color: #b9ffc4;
          font-weight: 800;
        }

        .rareDrop {
          margin-top: 6px;
          font-size: 12px;
          color: #ffe8a3;
          opacity: 0.9;
        }

        .cost {
          margin-top: 14px;
          font-size: 16px;
          font-weight: 900;
        }

        .builtInfo {
          margin-top: 22px;
          padding: 24px;
          border-radius: 22px;
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.16);
          text-align: center;
        }

        .builtIcon {
          font-size: 52px;
          margin-bottom: 10px;
        }

        .pendingRewards {
          margin-top: 16px;
          padding: 12px 16px;
          border-radius: 16px;
          background: rgba(255, 255, 255, 0.1);
          color: #b9ffc4;
          font-weight: 900;
        }

        .nextReward {
          margin-top: 10px;
          padding: 10px 14px;
          border-radius: 16px;
          background: rgba(255, 255, 255, 0.08);
          color: #ffe8a3;
          font-weight: 800;
        }

        .collectButton {
          margin-top: 20px;
          width: 100%;
          padding: 16px 20px;
          border: none;
          border-radius: 18px;
          background: linear-gradient(135deg, #b9ffc4, #58d878);
          color: #063b14;
          font-weight: 900;
          cursor: pointer;
        }

        .collectButton:disabled {
          opacity: 0.45;
          cursor: not-allowed;
        }

        .purchaseBox {
          margin-top: 22px;
          padding: 24px;
          border-radius: 22px;
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.16);
        }

        .purchaseBox h3 {
          margin: 0 0 8px;
          font-size: 24px;
        }

        .price {
          margin: 18px 0;
          font-size: 34px;
          font-weight: 900;
          color: #b9ffc4;
        }

        .purchaseButton {
          width: 100%;
          padding: 16px 20px;
          border: none;
          border-radius: 18px;
          background: linear-gradient(135deg, #b9ffc4, #58d878);
          color: #063b14;
          font-weight: 900;
          cursor: pointer;
        }

        @media (max-width: 760px) {
          .worldImage {
            width: 360vw;
            min-width: 2600px;
          }

          .topBar {
            top: 78px;
          }

          .topBar h1 {
            font-size: 24px;
          }

          .rightButtons {
            flex-direction: column;
            right: 12px;
            top: 12px;
          }

          .backButton {
            left: 12px;
            top: 12px;
          }

          .currencyPanel {
            right: 12px;
            bottom: 12px;
          }

          .buildGrid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </main>
  );
}