"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Product = {
  id: string;
  name: string;
  type: string;
  image: string;
  description: string;
  status?: "available" | "coming soon";
};

type HubArea = {
  id: string;
  title: string;
  label: string;
  status: "open" | "coming soon" | "locked";
  positionClass: string;
  items: Product[];
};

type BlindBoxPreview = {
  id: string;
  name: string;
  theme: string;
  image: string;
  description: string;
};

type TagColour = "blue" | "green" | "orange";

type NovaColour = "blue" | "purple";
type NovaPose = "inventor" | "action";
type NovaWeapon = "energy-wrench" | "spark-staff";
type PurchaseTier = "standard" | "premium";

type HapSet = "foundation" | "challenge";
type HapPack = "single" | "pack-3";

const TAG_COLOURS: {
  id: TagColour;
  name: string;
  label: string;
  image: string;
  className: string;
  previewClassName: string;
}[] = [
  {
    id: "blue",
    name: "Inventor Blue",
    label: "Nova's original colourway",
    image: "/store/nova-picks/inventor-tag-blue.png",
    className: "from-cyan-300 to-blue-600",
    previewClassName:
      "h-[430px] scale-100 translate-x-[-5px] translate-y-[-5px]",
  },
  {
    id: "green",
    name: "Explorer Green",
    label: "Fresh explorer colourway",
    image: "/store/nova-picks/inventor-tag-green.png",
    className: "from-lime-300 to-green-700",
    previewClassName:
      "h-[430px] scale-145 translate-x-[13px] translate-y-[0px]",
  },
  {
    id: "orange",
    name: "Creator Orange",
    label: "Bold creator colourway",
    image: "/store/nova-picks/inventor-tag-orange.png",
    className: "from-orange-300 to-orange-700",
    previewClassName:
      "h-[430px] scale-120 translate-x-[-5px] translate-y-[0px]",
  },
];

const GADGET_CRATE_COLOURS: {
  id: TagColour;
  name: string;
  label: string;
  image: string;
  className: string;
  previewClassName: string;
}[] = [
  {
    id: "blue",
    name: "Inventor Blue",
    label: "Nova's original colourway",
    image: "/store/nova-picks/gadget-crate-blue.png",
    className: "from-cyan-300 to-blue-600",
    previewClassName: "h-[430px] scale-100 translate-x-0 translate-y-0",
  },
  {
    id: "green",
    name: "Explorer Green",
    label: "Fresh explorer colourway",
    image: "/store/nova-picks/gadget-crate-green.png",
    className: "from-lime-300 to-green-700",
    previewClassName: "h-[430px] scale-95 translate-x-0 translate-y-0",
  },
  {
    id: "orange",
    name: "Creator Orange",
    label: "Bold creator colourway",
    image: "/store/nova-picks/gadget-crate-orange.png",
    className: "from-orange-300 to-orange-700",
    previewClassName: "h-[430px] scale-100 translate-x-0 translate-y-0",
  },
];

const NOVA_COLOURS: {
  id: NovaColour;
  name: string;
  label: string;
  className: string;
}[] = [
  {
    id: "blue",
    name: "Nova Blue",
    label: "Classic blue tech colourway.",
    className: "from-cyan-300 to-blue-700",
  },
  {
    id: "purple",
    name: "Nova Purple",
    label: "Signature inventor purple colourway.",
    className: "from-violet-300 to-purple-800",
  },
];

const NOVA_POSES: {
  id: NovaPose;
  name: string;
  label: string;
}[] = [
  {
    id: "inventor",
    name: "Inventor Pose",
    label: "Confident standing pose with inventor energy.",
  },
  {
    id: "action",
    name: "Action Pose",
    label: "Dynamic motion pose ready for adventure.",
  },
];

const NOVA_WEAPONS: {
  id: NovaWeapon;
  name: string;
  label: string;
}[] = [
  {
    id: "energy-wrench",
    name: "Energy Wrench",
    label: "Nova's main invention tool.",
  },
  {
    id: "spark-staff",
    name: "Spark Staff",
    label: "A glowing staff powered by Dreamscape energy.",
  },
];

const NOVA_PREVIEW_IMAGES: Record<
  NovaColour,
  Record<NovaPose, Record<NovaWeapon, string>>
> = {
  blue: {
    inventor: {
      "energy-wrench":
        "/activities/machine-zone/nova-previews/nova-blue-inventor-energy-wrench.png",
      "spark-staff":
        "/activities/machine-zone/nova-previews/nova-blue-inventor-spark-staff.png",
    },
    action: {
      "energy-wrench":
        "/activities/machine-zone/nova-previews/nova-blue-action-energy-wrench.png",
      "spark-staff":
        "/activities/machine-zone/nova-previews/nova-blue-action-spark-staff.png",
    },
  },
  purple: {
    inventor: {
      "energy-wrench":
        "/activities/machine-zone/nova-previews/nova-purple-inventor-energy-wrench.png",
      "spark-staff":
        "/activities/machine-zone/nova-previews/nova-purple-inventor-spark-staff.png",
    },
    action: {
      "energy-wrench":
        "/activities/machine-zone/nova-previews/nova-purple-action-energy-wrench.png",
      "spark-staff":
        "/activities/machine-zone/nova-previews/nova-purple-action-spark-staff.png",
    },
  },
};

const PURCHASE_OPTIONS: {
  id: PurchaseTier;
  name: string;
  price: number;
  label: string;
  colourCount: string;
  description: string;
}[] = [
  {
    id: "standard",
    name: "Standard Version",
    price: 19.9,
    label: "Less detailed · 2-colour print",
    colourCount: "2 colours",
    description:
      "A simplified 8cm Nova figurine with clean colour blocking and reduced fine details.",
  },
  {
    id: "premium",
    name: "Premium Version",
    price: 29.9,
    label: "More detailed · 4-colour print",
    colourCount: "Up to 4 colours",
    description:
      "A more detailed 8cm Nova figurine with stronger colour separation and a more premium finish.",
  },
];

const HAP_SETS: {
  id: HapSet;
  name: string;
  age: string;
  label: string;
  description: string;
}[] = [
  {
    id: "foundation",
    name: "Foundation Set",
    age: "7–8 years old",
    label: "Younger learners",
    description:
      "High Ability practice for younger learners building strong thinking, reasoning, and problem-solving skills.",
  },
  {
    id: "challenge",
    name: "Challenge Set",
    age: "9–10 years old",
    label: "Older learners",
    description:
      "A more challenging High Ability set for students ready for tougher enrichment-style practice.",
  },
];

const HAP_PACKS: {
  id: HapPack;
  name: string;
  label: string;
  price: number;
}[] = [
  {
    id: "single",
    name: "Single Pack",
    label: "One practice paper",
    price: 29.9,
  },
  {
    id: "pack-3",
    name: "Pack of 3",
    label: "Recommended bundle",
    price: 79.9,
  },
];

function getHapProductImage(set: HapSet, pack: HapPack) {
  return `/store/educational-resources/hap-${set}-${pack}.png`;
}

const NOVA_BLIND_BOX_PREVIEWS: BlindBoxPreview[] = [
  {
    id: "delivery-bolt",
    name: "Delivery Bolt",
    theme: "Singapore Delivery",
    image: "/activities/nova-blind-box/delivery-bolt.png",
    description:
      "A Singapore delivery-inspired Bolt with a simple green-and-white colour scheme and delivery pack.",
  },
  {
    id: "hawker-bolt",
    name: "Hawker Bolt",
    theme: "Singapore Hawker",
    image: "/activities/nova-blind-box/hawker-bolt.png",
    description:
      "A hawker-inspired Bolt serving local food with a bright orange apron and tray.",
  },
  {
    id: "barista-bolt",
    name: "Barista Bolt",
    theme: "Singapore Café",
    image: "/activities/nova-blind-box/barista-bolt.png",
    description:
      "A café-inspired Bolt with warm coffee colours, apron details, and a cup tray.",
  },
];

const HUB_AREAS: HubArea[] = [
  {
    id: "parts-supplies",
    title: "Nova Build Sets",
    label: "Prefab sets for building areas inside Nova's World.",
    status: "open",
    positionClass: "hotspotParts",
    items: [
      {
        id: "nova-room-set",
        name: "Nova Room Set",
        type: "Prefab Build Set",
        image: "/store/nova-build-sets/nova-room-set-placeholder.png",
        description:
          "A starter prefab set for building Nova-style rooms, learning spaces, and display areas inside Nova's World.",
        status: "coming soon",
      },
      {
        id: "mission-zone-set",
        name: "Mission Zone Set",
        type: "Prefab Build Set",
        image: "/store/nova-build-sets/mission-zone-set-placeholder.png",
        description:
          "A modular area-building set for creating quiz stations, mission corners, and activity zones.",
        status: "coming soon",
      },
      {
        id: "inventor-lab-set",
        name: "Inventor Lab Set",
        type: "Prefab Build Set",
        image: "/store/nova-build-sets/inventor-lab-set-placeholder.png",
        description:
          "A themed prefab set for building a mini inventor lab with machines, platforms, and tech details.",
        status: "coming soon",
      },
    ],
  },
  {
    id: "educational-resources",
    title: "Educational Resources",
    label: "Learning products and practice resources.",
    status: "open",
    positionClass: "hotspotPicks",
    items: [
      {
        id: "high-ability-practice-papers",
        name: "High Ability Practice Papers",
        type: "Practice Papers",
        image: "/store/educational-resources/hap-foundation-pack-3.png",
        description:
          "High Ability practice papers for advanced thinking, reasoning, and problem-solving.",
        status: "available",
      },
      {
        id: "word-realms",
        name: "Word Realms",
        type: "Vocabulary Game",
        image: "/store/educational-resources/word-realms.png",
        description:
          "A vocabulary-based learning game built around words, meanings, and quick-thinking challenges.",
        status: "coming soon",
      },
    ],
  },
  {
    id: "exclusive",
    title: "Nova's Blind Box",
    label: "Collect Singapore-inspired Bolt variants.",
    status: "open",
    positionClass: "hotspotExclusive",
    items: [
      {
        id: "nova-blind-box",
        name: "Nova's Blind Box",
        type: "Bolt Launch Series",
        image: "/activities/nova-blind-box/delivery-bolt.png",
        description:
          "A blind box featuring one random Singapore-inspired Bolt variant.",
        status: "available",
      },
    ],
  },
  {
    id: "machine-zone",
    title: "Machine Zone",
    label: "Coming soon for Student Access members.",
    status: "open",
    positionClass: "hotspotMachine",
    items: [
      {
        id: "machine-zone-coming-soon",
        name: "Machine Zone",
        type: "Exclusive Student Access Area",
        image: "",
        description:
          "Coming soon. This will be an exclusive area for Student Access members.",
        status: "coming soon",
      },
    ],
  },
];

export default function InventorHubPage() {
  const router = useRouter();

  const [selectedArea, setSelectedArea] = useState<HubArea | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  const [inventorTagStep, setInventorTagStep] = useState<1 | 2>(1);
  const [selectedTagColour, setSelectedTagColour] =
    useState<TagColour>("blue");
  const [inventorName, setInventorName] = useState("");

  const [novaColour] = useState<NovaColour>("purple");
  const [novaPose] = useState<NovaPose>("inventor");
  const [novaWeapon] = useState<NovaWeapon>("energy-wrench");

  const [machineStep, setMachineStep] = useState<1 | 2>(1);
  const [selectedPurchaseTier, setSelectedPurchaseTier] =
    useState<PurchaseTier>("standard");

  const [selectedHapSet, setSelectedHapSet] = useState<HapSet>("foundation");
  const [selectedHapPack, setSelectedHapPack] = useState<HapPack>("single");

  const currentOptions =
    selectedProduct?.id === "gadget-crate"
      ? GADGET_CRATE_COLOURS
      : TAG_COLOURS;

  const currentTag =
    currentOptions.find((tag) => tag.id === selectedTagColour) ??
    currentOptions[0];

  const selectedNovaColour =
    NOVA_COLOURS.find((item) => item.id === novaColour) ?? NOVA_COLOURS[0];

  const selectedNovaPose =
    NOVA_POSES.find((item) => item.id === novaPose) ?? NOVA_POSES[0];

  const selectedNovaWeapon =
    NOVA_WEAPONS.find((item) => item.id === novaWeapon) ?? NOVA_WEAPONS[0];

  const selectedPurchaseOption =
    PURCHASE_OPTIONS.find((item) => item.id === selectedPurchaseTier) ??
    PURCHASE_OPTIONS[0];

  const selectedHapSetData =
    HAP_SETS.find((item) => item.id === selectedHapSet) ?? HAP_SETS[0];

  const selectedHapPackData =
    HAP_PACKS.find((item) => item.id === selectedHapPack) ?? HAP_PACKS[0];

  const currentNovaPreviewImage =
    NOVA_PREVIEW_IMAGES[novaColour][novaPose][novaWeapon];

  const currentHapPreviewImage = getHapProductImage(
    selectedHapSet,
    selectedHapPack
  );

  function openArea(area: HubArea) {
    setSelectedArea(area);

    if (area.id === "machine-zone") {
      setMachineStep(1);
      setSelectedPurchaseTier("standard");
    }
  }

  function openProduct(product: Product) {
    if (product.status !== "available") {
      return;
    }

    if (product.id === "inventor-tag" || product.id === "gadget-crate") {
      setSelectedProduct(product);
      setInventorTagStep(1);
      setSelectedTagColour("blue");
      setInventorName("");
      return;
    }

    if (product.id === "high-ability-practice-papers") {
      setSelectedProduct(product);
      setSelectedHapSet("foundation");
      setSelectedHapPack("single");
    }
  }

  function closeProduct() {
    setSelectedProduct(null);
    setInventorTagStep(1);
    setSelectedTagColour("blue");
    setInventorName("");
    setSelectedHapSet("foundation");
    setSelectedHapPack("single");
  }

  function closeArea() {
    setSelectedArea(null);
    setMachineStep(1);
    setSelectedPurchaseTier("standard");
  }

  function addCustomProductToCart() {
    if (!selectedProduct) return;

    if (!inventorName.trim()) {
      alert("Please enter a name first.");
      return;
    }

    const cartItem = {
      id: `${selectedProduct.id}-${Date.now()}`,
      productType: selectedProduct.id,
      name: selectedProduct.name,
      colour: currentTag.name,
      customName: inventorName.trim().toUpperCase(),
      image: currentTag.image,
      quantity: 1,
      price: selectedProduct.id === "gadget-crate" ? 16.9 : 12.9,
    };

    const existingCart = JSON.parse(
      localStorage.getItem("dreamscape-cart") || "[]"
    );

    localStorage.setItem(
      "dreamscape-cart",
      JSON.stringify([...existingCart, cartItem])
    );

    alert(`${selectedProduct.name} added to cart!`);
    closeProduct();
  }

  function addCustomNovaToCart() {
    const cartItem = {
      id: `custom-nova-${Date.now()}`,
      productType: "custom-nova-figurine",
      name: "Custom Nova Figurine",
      colour: selectedNovaColour.name,
      pose: selectedNovaPose.name,
      weapon: selectedNovaWeapon.name,
      version: selectedPurchaseOption.name,
      colourCount: selectedPurchaseOption.colourCount,
      dimensions: "Approx. 8cm height",
      material: "3D printed PLA",
      description:
        "Custom Nova figurine based on selected colour, pose, and weapon. Final 3D printed product will be simplified compared to the digital preview.",
      image: currentNovaPreviewImage,
      quantity: 1,
      price: selectedPurchaseOption.price,
    };

    const existingCart = JSON.parse(
      localStorage.getItem("dreamscape-cart") || "[]"
    );

    localStorage.setItem(
      "dreamscape-cart",
      JSON.stringify([...existingCart, cartItem])
    );

    alert(`${selectedPurchaseOption.name} added to cart!`);
    closeArea();
  }

  function addHapProductToCart() {
    if (
      !selectedProduct ||
      selectedProduct.id !== "high-ability-practice-papers"
    ) {
      return;
    }

    const cartItem = {
      id: `hap-${selectedHapSet}-${selectedHapPack}-${Date.now()}`,
      productType: "high-ability-practice-papers",
      name: `High Ability Practice Papers · ${selectedHapSetData.name} · ${selectedHapPackData.name}`,
      set: selectedHapSetData.name,
      age: selectedHapSetData.age,
      pack: selectedHapPackData.name,
      description: selectedHapSetData.description,
      image: currentHapPreviewImage,
      quantity: 1,
      price: selectedHapPackData.price,
    };

    const existingCart = JSON.parse(
      localStorage.getItem("dreamscape-cart") || "[]"
    );

    localStorage.setItem(
      "dreamscape-cart",
      JSON.stringify([...existingCart, cartItem])
    );

    alert(`${cartItem.name} added to cart!`);
    closeProduct();
  }

  function addNovaBlindBoxToCart() {
    const cartItem = {
      id: `nova-blind-box-${Date.now()}`,
      productType: "nova-blind-box",
      name: "Nova's Blind Box",
      series: "Bolt Launch Series",
      description:
        "One random Singapore-inspired Bolt variant from Nova's Blind Box launch series.",
      possibleVariants: NOVA_BLIND_BOX_PREVIEWS.map((item) => item.name),
      image: "/activities/nova-blind-box/delivery-bolt.png",
      quantity: 1,
      price: 17.9,
      dimensions: "Approx. 8cm height",
      material: "3D printed PLA",
      disclaimer:
        "Blind box variant is random. Actual 3D printed product will not look as detailed as the digital preview.",
    };

    const existingCart = JSON.parse(
      localStorage.getItem("dreamscape-cart") || "[]"
    );

    localStorage.setItem(
      "dreamscape-cart",
      JSON.stringify([...existingCart, cartItem])
    );

    alert("Nova's Blind Box added to cart!");
    closeArea();
  }

  return (
    <main className="relative h-screen w-screen overflow-hidden bg-[#050816]">
      <video
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        poster="/activities/inventor hub/inventor-hub-bg.png"
        className="absolute inset-0 h-full w-full object-cover"
      >
        <source
          src="/activities/inventor hub/inventor-hub-bg-loop.mp4"
          type="video/mp4"
        />
      </video>

      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/20 via-black/5 to-black/45" />

      <button
        onClick={() => router.push("/inventor")}
        className="absolute left-5 top-5 z-20 rounded-full border border-cyan-300/60 bg-slate-950/60 px-4 py-2 text-xs font-bold tracking-[0.12em] text-cyan-50 shadow-[0_0_24px_rgba(0,220,255,0.35)] backdrop-blur-md hover:bg-cyan-400/20 sm:left-6 sm:top-6 sm:px-5 sm:py-3 sm:text-sm"
      >
        ← Exit Inventor Hub
      </button>

      <div className="absolute left-5 right-5 top-20 z-20 rounded-[22px] border border-cyan-300/35 bg-slate-950/55 px-5 py-4 text-cyan-50 shadow-[0_0_28px_rgba(0,220,255,0.22)] backdrop-blur-md sm:left-6 sm:right-auto sm:top-24 sm:max-w-[320px]">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-300">
          Inventor Hub
        </p>

        <h1 className="mt-2 text-xl font-black leading-tight text-white sm:text-2xl">
          Explore the 4 zones
        </h1>

        <p className="mt-2 text-sm leading-6 text-cyan-50/75">
          <span className="hidden sm:inline">
            Hover over each zone to discover build sets, learning resources,
            collectibles, and future tools.
          </span>

          <span className="sm:hidden">
            Tap each zone to discover build sets, learning resources,
            collectibles, and future tools.
          </span>
        </p>
      </div>

      <button
        onClick={() => router.push("/cart")}
        className="absolute right-5 top-5 z-20 flex items-center gap-2 rounded-full border border-cyan-300/60 bg-slate-950/60 px-4 py-2 text-xs font-bold tracking-[0.12em] text-cyan-50 shadow-[0_0_24px_rgba(0,220,255,0.35)] backdrop-blur-md hover:bg-cyan-400/20 sm:right-6 sm:top-6 sm:px-5 sm:py-3 sm:text-sm"
      >
        <span>🛒</span>
        Cart
      </button>

      {HUB_AREAS.map((area) => (
        <button
          key={area.id}
          onClick={() => openArea(area)}
          className={`hubHotspot ${area.positionClass}`}
          aria-label={area.title}
        >
          <span className="hotspotGlow" />
          <span className="hotspotLabel">
            <strong>{area.title}</strong>
            <small>{area.label}</small>
          </span>
        </button>
      ))}

      {selectedArea &&
        selectedArea.id !== "machine-zone" &&
        selectedArea.id !== "exclusive" && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 backdrop-blur-md"
            onClick={closeArea}
          >
            <section
              className="relative max-h-[86vh] w-full max-w-5xl overflow-y-auto rounded-[28px] border border-cyan-200/50 bg-gradient-to-br from-slate-950 via-indigo-950 to-purple-950 p-8 text-white shadow-[0_0_45px_rgba(0,220,255,0.3)]"
              onClick={(event) => event.stopPropagation()}
            >
              <button
                onClick={closeArea}
                className="absolute right-5 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-3xl text-white hover:bg-white/20"
              >
                ×
              </button>

              <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-cyan-300">
                Nova's Inventor Hub
              </p>

              <h1 className="mt-2 text-4xl font-black md:text-6xl">
                {selectedArea.title}
              </h1>

              <p className="mt-3 text-lg text-cyan-50/85">
                {selectedArea.label}
              </p>

              {selectedArea.id === "parts-supplies" && (
                <p className="mt-4 inline-flex rounded-full border border-cyan-200/25 bg-cyan-300/10 px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-cyan-100">
                  Coming Soon
                </p>
              )}

              <div className="mt-7 grid grid-cols-1 gap-5 sm:grid-cols-2 md:grid-cols-3">
                {selectedArea.items.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => openProduct(item)}
                    disabled={item.status !== "available"}
                    className={`rounded-[24px] border p-5 text-left shadow-[0_18px_35px_rgba(0,0,0,0.18)] transition ${
                      item.status === "available"
                        ? "cursor-pointer border-white bg-white hover:-translate-y-1 hover:shadow-[0_26px_50px_rgba(0,0,0,0.28)]"
                        : "cursor-not-allowed border-white/80 bg-white opacity-95"
                    }`}
                  >
                    <div className="relative flex h-44 w-full items-center justify-center overflow-hidden rounded-[18px] bg-[#ffffff]">
                      {item.image ? (
                        <img
                          src={item.image}
                          alt={item.name}
                          className="h-full w-full object-contain p-3"
                          draggable={false}
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center rounded-[18px] bg-[#ffffff] text-4xl text-slate-500">
                          ⚡
                        </div>
                      )}

                      {item.status === "coming soon" && (
                        <span className="absolute right-3 top-3 rounded-full border border-slate-200 bg-white/95 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-slate-700 shadow-sm">
                          Coming Soon
                        </span>
                      )}
                    </div>

                    <p className="mt-4 text-xs font-black uppercase tracking-[0.16em] text-cyan-700">
                      {item.type}
                    </p>

                    <h3 className="mt-2 text-xl font-black leading-snug text-slate-950">
                      {item.name}
                    </h3>

                    <p className="mt-3 text-sm leading-6 text-slate-700">
                      {item.description}
                    </p>
                  </button>
                ))}
              </div>
            </section>
          </div>
        )}

      {selectedArea?.id === "exclusive" && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 backdrop-blur-md"
          onClick={closeArea}
        >
          <section
            className="relative max-h-[90vh] w-full max-w-6xl overflow-y-auto rounded-[30px] border border-cyan-200/50 bg-gradient-to-br from-slate-950 via-indigo-950 to-purple-950 p-8 text-white shadow-[0_0_55px_rgba(0,220,255,0.35)]"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              onClick={closeArea}
              className="absolute right-5 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-3xl text-white hover:bg-white/20"
            >
              ×
            </button>

            <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-cyan-300">
              Nova's Blind Box
            </p>

            <h1 className="mt-2 text-4xl font-black md:text-6xl">
              Bolt Launch Series
            </h1>

            <p className="mt-3 max-w-3xl text-lg leading-relaxed text-cyan-50/85">
              Collect one random Singapore-inspired Bolt variant from Nova's
              launch blind box series.
            </p>

            <div className="mt-8 grid grid-cols-1 gap-5 md:grid-cols-3">
              {NOVA_BLIND_BOX_PREVIEWS.map((preview) => (
                <div
                  key={preview.id}
                  className="rounded-[24px] border border-white/10 bg-white/10 p-5"
                >
                  <div className="flex h-[330px] items-center justify-center rounded-[18px] bg-slate-950/45">
                    <img
                      src={preview.image}
                      alt={preview.name}
                      className="h-full w-full object-contain"
                      draggable={false}
                    />
                  </div>

                  <p className="mt-4 text-xs font-black uppercase tracking-[0.16em] text-cyan-300">
                    {preview.theme}
                  </p>

                  <h3 className="mt-1 text-2xl font-black">{preview.name}</h3>

                  <p className="mt-2 text-sm leading-relaxed text-slate-200/75">
                    {preview.description}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-8 grid grid-cols-1 gap-5 lg:grid-cols-[1fr_360px]">
              <div className="rounded-[24px] border border-white/10 bg-white/10 p-5 text-sm leading-relaxed text-slate-200/80">
                <p className="text-lg font-black text-white">
                  Product Description
                </p>

                <ul className="mt-3 list-disc space-y-2 pl-5">
                  <li>Includes 1 random Bolt variant from the launch series.</li>
                  <li>
                    Possible variants: Delivery Bolt, Hawker Bolt, or Barista
                    Bolt.
                  </li>
                  <li>Approximate size: 8cm height.</li>
                  <li>Material: 3D printed PLA.</li>
                  <li>Designed as a collectible display figurine.</li>
                  <li>Price: $17.90 per blind box.</li>
                </ul>

                <p className="mt-5 rounded-2xl border border-amber-300/30 bg-amber-300/10 p-4 text-xs leading-relaxed text-amber-100/90">
                  Disclaimer: Blind box variant is random. The actual 3D printed
                  product will not look as detailed as the digital preview.
                  Small details may be simplified, layer lines may be visible,
                  and colours may vary slightly depending on print settings and
                  material availability.
                </p>
              </div>

              <div className="rounded-[24px] border border-cyan-300/40 bg-cyan-300/10 p-5">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-cyan-300">
                  Nova's Blind Box
                </p>

                <h3 className="mt-2 text-3xl font-black">$17.90</h3>

                <p className="mt-2 text-sm leading-relaxed text-slate-200/75">
                  1 random 8cm Bolt figurine from the Singapore-inspired launch
                  series.
                </p>

                <button
                  onClick={addNovaBlindBoxToCart}
                  className="mt-6 w-full rounded-full bg-cyan-300 px-6 py-4 text-lg font-black text-slate-950 hover:bg-cyan-200"
                >
                  Add Blind Box to Cart
                </button>
              </div>
            </div>
          </section>
        </div>
      )}

      {selectedArea?.id === "machine-zone" && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 backdrop-blur-md"
          onClick={closeArea}
        >
          <section
            className="relative w-full max-w-3xl rounded-[30px] border border-cyan-200/50 bg-gradient-to-br from-slate-950 via-blue-950 to-purple-950 p-8 text-center text-white shadow-[0_0_55px_rgba(0,220,255,0.35)]"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              onClick={closeArea}
              className="absolute right-5 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-3xl text-white hover:bg-white/20"
            >
              ×
            </button>

            <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-cyan-300">
              Machine Zone
            </p>

            <h1 className="mt-3 text-4xl font-black md:text-6xl">
              Coming Soon
            </h1>

            <p className="mx-auto mt-5 max-w-xl text-lg leading-relaxed text-cyan-50/85">
              The Machine Zone is being prepared as an exclusive area for
              Student Access members.
            </p>

            <div className="mx-auto mt-8 max-w-md rounded-[24px] border border-cyan-200/20 bg-white/10 p-6">
              <p className="text-sm font-black uppercase tracking-[0.16em] text-cyan-300">
                Student Access Exclusive
              </p>

              <p className="mt-3 text-sm leading-relaxed text-slate-200/75">
                Future tools, member-only activities, and advanced creation
                features will appear here later.
              </p>
            </div>

            <button
              onClick={closeArea}
              className="mt-8 rounded-full bg-cyan-300 px-8 py-4 text-sm font-black uppercase tracking-[0.12em] text-slate-950 hover:bg-cyan-200"
            >
              Back to Inventor Hub
            </button>
          </section>
        </div>
      )}

      {(selectedProduct?.id === "inventor-tag" ||
        selectedProduct?.id === "gadget-crate") && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/75 px-4 backdrop-blur-md"
          onClick={closeProduct}
        >
          <section
            className="relative max-h-[90vh] w-full max-w-6xl overflow-y-auto rounded-[30px] border border-cyan-200/50 bg-gradient-to-br from-slate-950 via-blue-950 to-purple-950 p-8 text-white shadow-[0_0_55px_rgba(0,220,255,0.35)]"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              onClick={closeProduct}
              className="absolute right-5 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-3xl text-white hover:bg-white/20"
            >
              ×
            </button>

            <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-cyan-300">
              Nova's Picks
            </p>

            <h1 className="mt-2 text-4xl font-black md:text-6xl">
              {selectedProduct.name}
            </h1>

            <p className="mt-3 text-lg text-cyan-50/85">
              {selectedProduct.description}
            </p>

            <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_1.15fr]">
              <div className="rounded-[26px] border border-white/10 bg-white/10 p-5">
                <p className="mb-4 text-sm font-black uppercase tracking-wider text-cyan-300">
                  Preview
                </p>

                <img
                  src={currentTag.image}
                  alt={`${currentTag.name} Preview`}
                  className={`${currentTag.previewClassName} w-full object-contain transition-all duration-300`}
                  draggable={false}
                />
              </div>

              <div className="rounded-[26px] border border-white/10 bg-white/10 p-5">
                {inventorTagStep === 1 && (
                  <>
                    <p className="text-sm font-black uppercase tracking-wider text-cyan-300">
                      Step 1
                    </p>

                    <h2 className="mt-2 text-3xl font-black">
                      Choose Your Colour
                    </h2>

                    <p className="mt-2 text-sm text-slate-200/80">
                      Select the colour theme for your {selectedProduct.name}.
                    </p>

                    <div className="mt-6 grid grid-cols-1 gap-4">
                      {currentOptions.map((tag) => (
                        <button
                          key={tag.id}
                          onClick={() => setSelectedTagColour(tag.id)}
                          className={`flex items-center gap-4 rounded-2xl border p-4 text-left transition ${
                            selectedTagColour === tag.id
                              ? "border-cyan-300 bg-cyan-300/15"
                              : "border-white/10 bg-white/10 hover:bg-white/20"
                          }`}
                        >
                          <span
                            className={`h-16 w-16 rounded-2xl bg-gradient-to-br ${tag.className} shadow-lg`}
                          />

                          <span>
                            <span className="block text-xl font-black">
                              {tag.name}
                            </span>
                            <span className="mt-1 block text-sm text-slate-200/75">
                              {tag.label}
                            </span>
                          </span>

                          {selectedTagColour === tag.id && (
                            <span className="ml-auto rounded-full bg-cyan-300 px-3 py-1 text-xs font-black text-slate-950">
                              Selected
                            </span>
                          )}
                        </button>
                      ))}
                    </div>

                    <button
                      onClick={() => setInventorTagStep(2)}
                      className="mt-6 w-full rounded-full bg-cyan-300 px-6 py-4 text-lg font-black text-slate-950 hover:bg-cyan-200"
                    >
                      Continue
                    </button>
                  </>
                )}

                {inventorTagStep === 2 && (
                  <>
                    <p className="text-sm font-black uppercase tracking-wider text-cyan-300">
                      Step 2
                    </p>

                    <h2 className="mt-2 text-3xl font-black">
                      {selectedProduct.id === "inventor-tag"
                        ? "Enter Your Name"
                        : "Name Your Crate"}
                    </h2>

                    <input
                      value={inventorName}
                      onChange={(event) =>
                        setInventorName(event.target.value.toUpperCase())
                      }
                      maxLength={12}
                      placeholder="Your inventor name"
                      className="mt-6 w-full rounded-2xl border border-cyan-200/30 bg-slate-950/70 px-5 py-4 text-xl font-black uppercase text-white outline-none placeholder:text-white/30 focus:border-cyan-300"
                    />

                    <div className="mt-6 flex gap-3">
                      <button
                        onClick={() => setInventorTagStep(1)}
                        className="w-1/2 rounded-full border border-white/20 bg-white/10 px-6 py-4 text-lg font-black text-white hover:bg-white/20"
                      >
                        Back
                      </button>

                      <button
                        onClick={addCustomProductToCart}
                        className="w-1/2 rounded-full bg-cyan-300 px-6 py-4 text-lg font-black text-slate-950 hover:bg-cyan-200"
                      >
                        Add to Cart
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </section>
        </div>
      )}

      {selectedProduct?.id === "high-ability-practice-papers" && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/75 px-4 backdrop-blur-md"
          onClick={closeProduct}
        >
          <section
            className="relative max-h-[90vh] w-full max-w-6xl overflow-y-auto rounded-[30px] border border-cyan-200/50 bg-gradient-to-br from-slate-950 via-blue-950 to-purple-950 p-8 text-white shadow-[0_0_55px_rgba(0,220,255,0.35)]"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              onClick={closeProduct}
              className="absolute right-5 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-3xl text-white hover:bg-white/20"
            >
              ×
            </button>

            <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-cyan-300">
              Educational Resources
            </p>

            <h1 className="mt-2 text-4xl font-black md:text-6xl">
              High Ability Practice Papers
            </h1>

            <p className="mt-3 max-w-3xl text-lg leading-relaxed text-cyan-50/85">
              Choose between Foundation or Challenge, then select a single pack
              or the recommended pack of 3.
            </p>

            <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_1.1fr]">
              <div className="rounded-[26px] border border-white/10 bg-white/10 p-5">
                <p className="mb-4 text-sm font-black uppercase tracking-wider text-cyan-300">
                  Preview
                </p>

                <div className="flex min-h-[430px] items-center justify-center rounded-[22px] bg-[#ffffff] p-4">
                  <img
                    src={currentHapPreviewImage}
                    alt={`${selectedHapSetData.name} ${selectedHapPackData.name}`}
                    className="max-h-[400px] w-full object-contain"
                    draggable={false}
                  />
                </div>

                <div className="mt-5 rounded-2xl border border-cyan-200/18 bg-cyan-300/10 p-4">
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-cyan-300">
                    Selected
                  </p>

                  <p className="mt-2 text-2xl font-black">
                    {selectedHapSetData.name} · {selectedHapPackData.name}
                  </p>

                  <p className="mt-1 text-sm text-slate-200/75">
                    {selectedHapSetData.age}
                  </p>

                  <p className="mt-4 text-4xl font-black text-amber-200">
                    ${selectedHapPackData.price.toFixed(2)}
                  </p>
                </div>
              </div>

              <div className="rounded-[26px] border border-white/10 bg-white/10 p-5">
                <p className="text-sm font-black uppercase tracking-wider text-cyan-300">
                  Step 1
                </p>

                <h2 className="mt-2 text-3xl font-black">Choose Your Set</h2>

                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  {HAP_SETS.map((set) => {
                    const isSelected = selectedHapSet === set.id;

                    return (
                      <button
                        key={set.id}
                        type="button"
                        onClick={() => setSelectedHapSet(set.id)}
                        className={`rounded-3xl border p-5 text-left transition hover:scale-[1.02] ${
                          isSelected
                            ? "border-cyan-300 bg-cyan-300/15"
                            : "border-white/10 bg-white/10 hover:bg-white/20"
                        }`}
                      >
                        <span className="block text-2xl font-black">
                          {set.name}
                        </span>

                        <span className="mt-2 block text-sm font-bold text-cyan-100">
                          {set.age}
                        </span>

                        <span className="mt-3 block text-sm leading-6 text-slate-200/75">
                          {set.description}
                        </span>

                        {isSelected && (
                          <span className="mt-4 inline-flex rounded-full bg-cyan-300 px-3 py-1 text-xs font-black uppercase tracking-[0.12em] text-slate-950">
                            Selected
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                <p className="mt-8 text-sm font-black uppercase tracking-wider text-cyan-300">
                  Step 2
                </p>

                <h2 className="mt-2 text-3xl font-black">Choose Pack</h2>

                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  {HAP_PACKS.map((pack) => {
                    const isSelected = selectedHapPack === pack.id;

                    return (
                      <button
                        key={pack.id}
                        type="button"
                        onClick={() => setSelectedHapPack(pack.id)}
                        className={`rounded-3xl border p-5 text-left transition hover:scale-[1.02] ${
                          isSelected
                            ? "border-amber-300 bg-amber-300/15"
                            : "border-white/10 bg-white/10 hover:bg-white/20"
                        }`}
                      >
                        <span className="block text-xl font-black">
                          {pack.name}
                        </span>

                        <span className="mt-2 block text-sm text-slate-200/70">
                          {pack.label}
                        </span>

                        <span className="mt-4 block text-3xl font-black text-amber-200">
                          ${pack.price.toFixed(2)}
                        </span>

                        {pack.id === "pack-3" && (
                          <span className="mt-3 inline-flex rounded-full border border-amber-300/30 bg-amber-300/10 px-3 py-1 text-xs font-black uppercase tracking-[0.12em] text-amber-100">
                            Best Value
                          </span>
                        )}

                        {isSelected && (
                          <span className="mt-3 inline-flex rounded-full bg-amber-300 px-3 py-1 text-xs font-black uppercase tracking-[0.12em] text-slate-950">
                            Selected
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                <div className="mt-8 rounded-3xl border border-cyan-200/20 bg-slate-950/45 p-5">
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-cyan-300">
                    Order Summary
                  </p>

                  <p className="mt-3 text-xl font-black">
                    {selectedHapSetData.name} · {selectedHapPackData.name}
                  </p>

                  <p className="mt-1 text-sm text-slate-200/70">
                    {selectedHapSetData.age}
                  </p>

                  <p className="mt-4 text-4xl font-black text-amber-200">
                    ${selectedHapPackData.price.toFixed(2)}
                  </p>
                </div>

                <button
                  onClick={addHapProductToCart}
                  className="mt-6 w-full rounded-full bg-cyan-300 px-6 py-4 text-lg font-black text-slate-950 hover:bg-cyan-200"
                >
                  Add to Cart
                </button>
              </div>
            </div>
          </section>
        </div>
      )}

      <style jsx>{`
        .hubHotspot {
          position: absolute;
          z-index: 10;
          border: 0;
          background: transparent;
          cursor: pointer;
        }

        .hotspotGlow {
          display: none;
        }

        .hotspotLabel {
          position: absolute;
          left: 50%;
          top: 50%;
          min-width: 230px;
          transform: translate(-50%, -50%);
          border-radius: 16px;
          border: 1px solid rgba(125, 247, 255, 0.38);
          background: rgba(4, 12, 32, 0.58);
          padding: 12px 14px;
          color: white;
          opacity: 0.38;
          pointer-events: none;
          box-shadow: 0 0 18px rgba(0, 225, 255, 0.16);
          backdrop-filter: blur(10px);
          transition:
            opacity 260ms ease,
            transform 260ms ease,
            border-color 260ms ease,
            background 260ms ease,
            box-shadow 260ms ease;
        }

        .hotspotLabel strong {
          display: block;
          color: #7df7ff;
          font-size: 15px;
          font-weight: 900;
        }

        .hotspotLabel small {
          display: block;
          margin-top: 4px;
          color: rgba(255, 255, 255, 0.78);
          font-size: 12px;
        }

        .hubHotspot:hover .hotspotLabel,
        .hubHotspot:focus-visible .hotspotLabel {
          opacity: 1;
          transform: translate(-50%, -50%) scale(1.03);
          border-color: rgba(125, 247, 255, 0.85);
          background: rgba(4, 12, 32, 0.92);
          box-shadow: 0 0 28px rgba(0, 225, 255, 0.38);
        }

        .hubHotspot:hover .hotspotLabel small,
        .hubHotspot:focus-visible .hotspotLabel small {
          color: rgba(255, 255, 255, 0.95);
        }

        .hotspotPrototype {
          left: 35%;
          top: 0%;
          width: 30%;
          height: 17%;
        }

        .hotspotParts {
          left: 3%;
          top: 24%;
          width: 20%;
          height: 52%;
        }

        .hotspotPicks {
          left: 22%;
          top: 27%;
          width: 17%;
          height: 36%;
        }

        .hotspotExclusive {
          left: 60%;
          top: 27%;
          width: 17%;
          height: 36%;
        }

        .hotspotMachine {
          right: 0%;
          top: 24%;
          width: 24%;
          height: 52%;
        }

        @media (hover: none) {
          .hotspotLabel {
            opacity: 0.92;
            background: rgba(4, 12, 32, 0.82);
            border-color: rgba(125, 247, 255, 0.58);
          }
        }

        @media (max-width: 768px) {
          .hubHotspot {
            left: 18px !important;
            right: 18px !important;
            width: auto !important;
            height: 76px !important;
          }

          .hotspotParts {
            top: 238px !important;
          }

          .hotspotPicks {
            top: 326px !important;
          }

          .hotspotExclusive {
            top: 414px !important;
          }

          .hotspotMachine {
            top: 502px !important;
          }

          .hotspotLabel {
            left: 0;
            top: 0;
            width: 100%;
            min-width: 0;
            height: 76px;
            transform: none;
            opacity: 0.94;
            border-radius: 18px;
            display: flex;
            flex-direction: column;
            justify-content: center;
            background: rgba(4, 12, 32, 0.82);
            border-color: rgba(125, 247, 255, 0.5);
            box-shadow: 0 0 18px rgba(0, 225, 255, 0.18);
          }

          .hubHotspot:hover .hotspotLabel,
          .hubHotspot:focus-visible .hotspotLabel {
            transform: none;
            opacity: 1;
          }

          .hotspotLabel strong {
            font-size: 14px;
          }

          .hotspotLabel small {
            font-size: 11px;
            line-height: 1.35;
          }
        }
      `}</style>
    </main>
  );
}