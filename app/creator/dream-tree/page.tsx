"use client";

import { useEffect, useRef, useState } from "react";

const introLines = [
  "Hey... I'm Milo. I'm glad you found this place.",
  "Whenever I felt stuck, I wrote down my dreams and slowly worked towards them.",
  "Over time, those dreams began to grow into reality.",
  "That's how I discovered the Dream Tree. Let's start growing yours!",
];

const treeOptions = [
  {
    id: "evergreen",
    name: "Evergreen Tree",
    image: "/dream-tree/evergreen-tree.png",
    description: "A timeless tree that grows with every dream.",
  },
  {
    id: "circuit",
    name: "Dream Circuit",
    image: "/dream-tree/dream-circuit-tree.png",
    description: "(Coming Soon)",
  },
  {
    id: "celestial",
    name: "Celestial Tree",
    image: "/dream-tree/celestial-tree.png",
    description: "(Coming Soon)",
  },
];

export default function DreamTreePage() {
  const [step, setStep] = useState(0);
  const [typedText, setTypedText] = useState("");
  const [scene, setScene] = useState<"intro" | "clearing">("intro");
  const [showChoices, setShowChoices] = useState(false);
  const [selectedTree, setSelectedTree] = useState<string | null>(null);
  const [skipHolding, setSkipHolding] = useState(false);

  const skipTimerRef = useRef<NodeJS.Timeout | null>(null);

  const currentLine = introLines[step];

  useEffect(() => {
    if (scene !== "intro") return;

    setTypedText("");
    let index = 0;

    const interval = setInterval(() => {
      setTypedText(currentLine.slice(0, index + 1));
      index++;

      if (index >= currentLine.length) clearInterval(interval);
    }, 28);

    return () => clearInterval(interval);
  }, [step, currentLine, scene]);

  function goToCreatorWorld() {
    window.location.href = "/creator";
  }

  function skipIntro() {
    if (skipTimerRef.current) {
      clearTimeout(skipTimerRef.current);
    }

    setSkipHolding(false);
    setScene("clearing");

    setTimeout(() => {
      setShowChoices(true);
    }, 600);
  }

  function startSkipHold() {
    setSkipHolding(true);

    skipTimerRef.current = setTimeout(() => {
      skipIntro();
    }, 900);
  }

  function cancelSkipHold() {
    setSkipHolding(false);

    if (skipTimerRef.current) {
      clearTimeout(skipTimerRef.current);
      skipTimerRef.current = null;
    }
  }

  function handleNext() {
    if (typedText.length < currentLine.length) {
      setTypedText(currentLine);
      return;
    }

    if (step < introLines.length - 1) {
      setStep(step + 1);
    } else {
      setScene("clearing");

      setTimeout(() => {
        setShowChoices(true);
      }, 1000);
    }
  }

  function chooseTree(treeId: string) {
    setSelectedTree(treeId);
  }

  function growTree() {
    if (!selectedTree) return;

    localStorage.setItem("dream-tree-type", selectedTree);

    if (selectedTree === "evergreen") {
      window.location.href = "/creator/dream-tree/evergreen";
    }
  }

  return (
    <main className="dreamPage">
      <button className="backCreatorButton" onClick={goToCreatorWorld}>
        Back to Creator World
      </button>

      {scene === "intro" && (
        <section className="scene introScene">
          <div className="miloCard">
            <div className="miloName">MILO</div>
            <p>{typedText}</p>

            <button onClick={handleNext}>
              {typedText.length < currentLine.length ? "Skip" : "Continue"}
            </button>
          </div>

          <button
            className={`holdSkipButton ${skipHolding ? "holding" : ""}`}
            onMouseDown={startSkipHold}
            onMouseUp={cancelSkipHold}
            onMouseLeave={cancelSkipHold}
            onTouchStart={startSkipHold}
            onTouchEnd={cancelSkipHold}
          >
            Hold to Skip
          </button>
        </section>
      )}

      {scene === "clearing" && (
        <section className="scene clearingScene">
          <div className="clearingOverlay">
            <div className="miloCard treeIntro">
              <div className="miloName">MILO</div>
              <p>Every dream grows differently. Which tree feels most like you?</p>
            </div>

            {showChoices && (
              <>
                <div className="treeChoices">
                  {treeOptions.map((tree) => (
                    <button
                      key={tree.id}
                      className={`treeCard ${
                        selectedTree === tree.id ? "selected" : ""
                      }`}
                      onClick={() => chooseTree(tree.id)}
                    >
                      <div className="treeImageWrap">
                        <img src={tree.image} alt={tree.name} />
                      </div>

                      <h3>{tree.name}</h3>
                      <p>{tree.description}</p>
                    </button>
                  ))}
                </div>

                {selectedTree && (
                  <button className="growButton" onClick={growTree}>
                    Grow This Tree
                  </button>
                )}
              </>
            )}
          </div>
        </section>
      )}

      <style jsx>{`
        .dreamPage {
          width: 100vw;
          height: 100vh;
          overflow: hidden;
          background: #050816;
          color: white;
          font-family: Arial, sans-serif;
        }

        .backCreatorButton {
          position: fixed;
          top: 24px;
          right: 24px;
          z-index: 80;
          padding: 12px 18px;
          border: 1px solid rgba(255, 255, 255, 0.22);
          border-radius: 999px;
          background: rgba(8, 22, 16, 0.76);
          color: white;
          font-weight: 800;
          cursor: pointer;
          backdrop-filter: blur(12px);
        }

        .backCreatorButton:hover {
          background: rgba(255, 218, 130, 0.2);
        }

        .holdSkipButton {
          position: fixed;
          right: 200px;
          bottom: 100px;
          z-index: 90;
          padding: 14px 22px;
          border-radius: 999px;
          border: 1px solid rgba(255, 255, 255, 0.22);
          background: rgba(18, 16, 28, 0.78);
          color: white;
          font-weight: 900;
          cursor: pointer;
          overflow: hidden;
          backdrop-filter: blur(12px);
        }

        .holdSkipButton::before {
          content: "";
          position: absolute;
          inset: 0;
          width: 0%;
          background: rgba(255, 218, 130, 0.35);
          z-index: -1;
        }

        .holdSkipButton.holding::before {
          width: 100%;
          transition: width 0.9s linear;
        }

        .scene {
          position: relative;
          width: 100%;
          height: 100%;
          background-size: cover;
          background-position: center;
        }

        .introScene {
          background-image: url("/dream-tree/milo-shed.png");
          animation: shedCamera 18s ease-in-out forwards;
        }

        .clearingScene {
          background-image: url("/dream-tree/dream-tree-clearing.png");
          animation: clearingCamera 2.4s ease-out forwards;
        }

        @keyframes shedCamera {
          0% {
            transform: scale(1.08) translateX(0);
          }
          100% {
            transform: scale(1.18) translateX(-2%);
          }
        }

        @keyframes clearingCamera {
          0% {
            transform: scale(1.25) translateY(4%);
            opacity: 0;
          }
          100% {
            transform: scale(1) translateY(0);
            opacity: 1;
          }
        }

        .miloCard {
          position: absolute;
          left: 50%;
          bottom: 7%;
          transform: translateX(-50%);
          width: min(760px, 88vw);
          padding: 24px 28px;
          border-radius: 24px;
          background: rgba(18, 16, 28, 0.78);
          border: 1px solid rgba(255, 255, 255, 0.22);
          backdrop-filter: blur(14px);
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.45);
          z-index: 3;
        }

        .miloName {
          margin-bottom: 8px;
          font-size: 13px;
          letter-spacing: 0.22em;
          color: #ffd98a;
          font-weight: 800;
        }

        .miloCard p {
          min-height: 56px;
          margin: 0;
          font-size: clamp(18px, 2.2vw, 26px);
          line-height: 1.45;
        }

        .miloCard button {
          margin-top: 18px;
          padding: 12px 22px;
          border: none;
          border-radius: 999px;
          background: linear-gradient(135deg, #ffe8a3, #ffb84d);
          color: #2d1b00;
          font-weight: 800;
          cursor: pointer;
        }

        .clearingOverlay {
          position: absolute;
          inset: 0;
          background: linear-gradient(
            to bottom,
            rgba(0, 0, 0, 0.08),
            rgba(0, 0, 0, 0.42)
          );
        }

        .treeIntro {
          top: 4%;
          bottom: auto;
        }

        .treeIntro p {
          min-height: auto;
          text-align: center;
        }

        .treeChoices {
          position: absolute;
          left: 50%;
          bottom: 10%;
          transform: translateX(-50%);
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 18px;
          width: min(1080px, 94vw);
          animation: choiceAppear 0.7s ease-out forwards;
          z-index: 4;
        }

        @keyframes choiceAppear {
          from {
            opacity: 0;
            transform: translateX(-50%) translateY(24px);
          }
          to {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
          }
        }

        .treeCard {
          position: relative;
          height: 410px;
          padding: 16px 16px 20px;
          border-radius: 26px;
          border: 1px solid rgba(255, 255, 255, 0.24);
          background: rgba(12, 18, 31, 0.72);
          backdrop-filter: blur(14px);
          color: white;
          cursor: pointer;
          transition: 0.25s ease;
          overflow: hidden;
        }

        .treeCard:hover {
          transform: translateY(-10px) scale(1.03);
          background: rgba(28, 38, 61, 0.84);
        }

        .treeCard.selected {
          border: 2px solid #ffd98a;
          box-shadow: 0 0 30px rgba(255, 217, 138, 0.65);
        }

        .treeImageWrap {
          height: 275px;
          display: flex;
          align-items: flex-end;
          justify-content: center;
        }

        .treeImageWrap img {
          max-height: 100%;
          max-width: 100%;
          object-fit: contain;
          filter: drop-shadow(0 18px 24px rgba(0, 0, 0, 0.45));
          transition: 0.25s ease;
        }

        .treeCard:hover img {
          transform: scale(1.08);
        }

        .treeCard h3 {
          margin: 14px 0 8px;
          font-size: 21px;
        }

        .treeCard p {
          margin: 0;
          font-size: 14px;
          line-height: 1.4;
          opacity: 0.86;
        }

        .growButton {
          position: absolute;
          left: 50%;
          bottom: 3%;
          transform: translateX(-50%);
          z-index: 5;
          padding: 14px 34px;
          border: none;
          border-radius: 999px;
          background: linear-gradient(135deg, #ffe8a3, #ffb84d);
          color: #2d1b00;
          font-weight: 900;
          font-size: 16px;
          cursor: pointer;
          box-shadow: 0 14px 30px rgba(0, 0, 0, 0.35);
        }

        @media (max-width: 900px) {
          .treeChoices {
            grid-template-columns: 1fr;
            bottom: 8%;
            max-height: 68vh;
            overflow-y: auto;
          }

          .treeCard {
            height: auto;
          }

          .treeImageWrap {
            height: 220px;
          }

          .treeIntro {
            top: 2%;
          }

          .miloCard {
            padding: 18px;
          }

          .backCreatorButton {
            top: 14px;
            right: 14px;
          }

          .holdSkipButton {
            right: 14px;
            bottom: 14px;
          }
        }
      `}</style>
    </main>
  );
}