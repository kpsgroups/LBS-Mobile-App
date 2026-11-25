import { builders } from "./designs.ts";

export type FinishId = number | string;
export type Layout = "Shelves" | "Hanging" | "Mixed";
export interface Design {
  kind?: FurnitureKind;
  product?: string;
  width: number;
  height: number;
  depth: number;
  bays: number;
  layout: Layout;
  finish: FinishId;
  // Second and third laminates for designs with feature panels (marble, stone,
  // gloss) or detail parts (slats, shelves). Older designs leave them unset.
  accent?: FinishId;
  detail?: FinishId;
}
export const limits = {
  width: [900, 3000, 100],
  height: [1800, 2700, 100],
  depth: [450, 750, 50],
  bays: [2, 4, 1],
} as const;
export const initialDesign: Design = {
  width: 1800,
  height: 2200,
  depth: 600,
  bays: 3,
  layout: "Mixed",
  finish: 12073,
};
export type Triple = [number, number, number];
// finish, accent and detail are Meraki laminates chosen per design. The rest are
// fixed materials: LED strips (glow), bronze mirror, gold trim and a TV screen.
export type Surface =
  | "finish" | "accent" | "detail"
  | "interior" | "hardware" | "plinth"
  | "glow" | "mirror" | "trim" | "screen";
export const laminateSurfaces = ["finish", "accent", "detail"] as const;
export type LaminateSurface = (typeof laminateSurfaces)[number];
export type Point = [number, number];
export type Part = {
  id: string;
  center: Triple;
  // Bounding box. For a shaped part, size[2] is the extrusion depth.
  size: Triple;
  surface: Surface;
  // Optional front outline (arches, discs, curves) relative to the centre in the
  // XY plane, extruded along Z by size[2]. Parts without one are plain boxes.
  outline?: Point[];
};

// Geometry is expressed in metres. The local origin is the centre of the footprint at floor level.
export function wardrobe(d: Design, open = false): Part[] {
  const w = d.width / 1000,
    h = d.height / 1000,
    depth = d.depth / 1000;
  const board = 0.018,
    toe = 0.075;
  const parts: Part[] = [];
  function box(id: string, surface: Surface, size: Triple, center: Triple) {
    parts.push({ id, surface, size, center });
  }
  const bodyDepth = depth - 0.05;
  const z = -depth / 2 + bodyDepth / 2;
  box(
    "recessed base",
    "plinth",
    [w - 0.06, toe, bodyDepth - 0.06],
    [0, toe / 2, z],
  );
  box(
    "back",
    "interior",
    [w, h - toe, board],
    [0, (h + toe) / 2, -depth / 2 + board / 2],
  );
  for (const side of [-1, 1]) {
    box(
      "side " + side,
      "finish",
      [board, h - toe, bodyDepth],
      [(side * (w - board)) / 2, (h + toe) / 2, z],
    );
  }
  box("top", "finish", [w, board, bodyDepth], [0, h - board / 2, z]);
  box("base", "interior", [w, board, bodyDepth], [0, toe + board / 2, z]);
  const bayWidth = (w - board) / d.bays;
  for (let i = 0; i < d.bays; i++) {
    const x = -w / 2 + board / 2 + bayWidth * (i + 0.5);
    if (i > 0)
      box(
        "divider " + i,
        "interior",
        [board, h - toe - 2 * board, bodyDepth - board],
        [x - bayWidth / 2, (h + toe) / 2, z],
      );
    const hanging = d.layout === "Hanging" || (d.layout === "Mixed" && i === 0);
    const levels = hanging ? [0.82] : [0.24, 0.44, 0.64, 0.82];
    for (const level of levels)
      box(
        "shelf " + i + " " + level,
        "interior",
        [bayWidth - board, board, bodyDepth - board],
        [x, h * level, z],
      );
    if (hanging)
      box(
        "rail " + i,
        "hardware",
        [bayWidth - board, 0.02, 0.02],
        [x, h * 0.75, z],
      );
    if (!open) {
      const doorWidth = w / d.bays;
      const dx = -w / 2 + doorWidth * (i + 0.5);
      box(
        "door " + i,
        "finish",
        [doorWidth - 0.004, h - toe - 0.004, board],
        [dx, (h + toe) / 2, depth / 2 - 0.032 - board / 2],
      );
      box(
        "pull " + i,
        "hardware",
        [0.016, 0.25, 0.032],
        [
          dx + (i % 2 ? -1 : 1) * (doorWidth / 2 - 0.045),
          h * 0.48,
          depth / 2 - 0.016,
        ],
      );
    }
  }
  return parts;
}

// Dimensions are in millimetres in the editor and metres in the shared renderer.
export const furniture = {
  wardrobe: { name: "Studio wardrobe", size: [1800, 2200, 600], finish: 12073 },
  kitchen: { name: "Modular kitchen", size: [2800, 2200, 600], finish: 3030 },
  cabinet: { name: "Sideboard cabinet", size: [1600, 850, 450], finish: 12077 },
  media: { name: "TV console", size: [2000, 550, 450], finish: 12071 },
  shelves: { name: "Open bookcase", size: [1200, 1900, 350], finish: 12075 },
  desk: { name: "Study desk", size: [1400, 750, 650], finish: 12079 },
  bed: { name: "Platform bed", size: [1600, 1000, 2100], finish: 12074 },
  vanity: { name: "Dressing vanity", size: [1200, 1650, 450], finish: 9018 },
  shoes: { name: "Shoe cabinet", size: [1000, 1100, 350], finish: 9033 },
  dining: { name: "Dining table", size: [1800, 750, 900], finish: 12072 },
  nightstand: { name: "Bedside drawers", size: [500, 500, 400], finish: 12076 },
  partition: { name: "Slatted partition", size: [1200, 2200, 250], finish: 12081 },
  archMirror: { name: "Arch mirror partition", size: [2400, 2700, 100], finish: 9033 },
  jaaliArch: { name: "Lattice archway", size: [2400, 2400, 350], finish: 12077 },
  nicheArch: { name: "Niche archway", size: [2700, 2600, 400], finish: 12073 },
  flutedStone: { name: "Fluted stone wall", size: [3000, 2700, 80], finish: 12077 },
  marbleSlat: { name: "Marble & slat wall", size: [3200, 2700, 60], finish: 12073 },
  slabGold: { name: "Gold inlay marble wall", size: [3600, 2700, 40], finish: 3012 },
  neroWall: { name: "Nero feature wall", size: [3600, 2700, 80], finish: 12079 },
  nicheSlat: { name: "Slatted niche wall", size: [3000, 2700, 250], finish: 12071 },
  archShelves: { name: "Arch niche shelving", size: [3000, 2700, 350], finish: "3002A" },
  haloTv: { name: "Halo TV wall", size: [2800, 2600, 350], finish: 12077 },
  waveTv: { name: "Sculpted wave TV wall", size: [3600, 2700, 350], finish: 9032 },
  archTv: { name: "Marble arch TV unit", size: [3200, 2700, 450], finish: 546 },
  glowTv: { name: "Glow frame TV wall", size: [3400, 2700, 350], finish: 12074 },
  arcWardrobe: { name: "Arc dressing wardrobe", size: [3600, 2700, 600], finish: 546 },
  glossWardrobe: { name: "Gloss window wardrobe", size: [3600, 2700, 600], finish: 515 },
} as const;
// Second and third laminates and the meaning of the section count for the
// feature walls, TV units, archways and designer wardrobes.
const extras: Partial<Record<FurnitureKind, { accent?: FinishId; detail?: FinishId; sections?: string }>> = {
  archMirror: { accent: 12077, sections: "Mirror pairs" },
  jaaliArch: { accent: 501 },
  nicheArch: { accent: 9018 },
  flutedStone: { accent: 3014, sections: "Wood sections" },
  marbleSlat: { accent: 3013 },
  slabGold: { sections: "Gold joints" },
  neroWall: { accent: 3029 },
  nicheSlat: { sections: "Niche columns" },
  archShelves: { accent: 3037, detail: 12073 },
  waveTv: { accent: 3037 },
  archTv: { accent: 3013, detail: 12073 },
  glowTv: { accent: 3016 },
  arcWardrobe: { detail: 12077 },
};
export function sectionLabel(d: Design): string | null {
  const kind = d.kind ?? "wardrobe";
  if (kind in builders) return extras[kind]?.sections ?? null;
  return ["bed", "dining", "desk", "vanity", "media"].includes(kind) ? null : "Door count";
}
export type FurnitureKind = keyof typeof furniture;
export const kinds = Object.keys(furniture) as FurnitureKind[];
export const furnitureName = (d: Design) => products.find(p => p.key === d.product && p.design.kind === d.kind)?.title ?? furniture[d.kind ?? "wardrobe"].name;
export function newDesign(kind: FurnitureKind): Design {
  const { size: [width, height, depth], finish } = furniture[kind];
  const { accent, detail } = extras[kind] ?? {};
  return { ...initialDesign, width, height, depth, finish, kind, ...(accent !== undefined && { accent }), ...(detail !== undefined && { detail }) };
}
export function designLimits(d: Design) {
  if (!d.kind || d.kind === "wardrobe") return limits;
  const [w, h, z] = furniture[d.kind].size;
  // Thin wall panels change depth in 10 mm steps so the minimum never rounds to zero.
  const range = (base: number) => {
    const step = base < 300 ? 10 : 50;
    return [Math.round(base * 0.6 / step) * step, Math.round(base * 1.5 / step) * step, step] as const;
  };
  return { width: range(w), height: range(h), depth: range(z), bays: limits.bays };
}

export function furnitureParts(d: Design, open = false): Part[] {
  if (!d.kind || d.kind === "wardrobe") return wardrobe(d, open);
  const w = d.width / 1000, h = d.height / 1000, z = d.depth / 1000;
  const parts: Part[] = [];
  const t = 0.018;
  function box(id: string, size: Triple, center: Triple, surface: Surface = "finish", outline?: Point[]) {
    parts.push(outline ? { id, size, center, surface, outline } : { id, size, center, surface });
  }
  const build = builders[d.kind];
  if (build) {
    build(box, { w, h, z, n: d.bays, open });
    return parts;
  }
  function shelves(id: string, width: number, height: number, depth: number, cx: number, cy: number, cz: number, bays: number, levels: number, doors: boolean) {
    const floor = cy - height / 2, front = cz + depth / 2;
    for (const side of [-1, 1]) {
      box(id+" side "+side, [t,height,depth], [cx+side*(width-t)/2,cy,cz]);
      box(id+" cap "+side, [width-2*t,t,depth], [cx,cy+side*(height-t)/2,cz]);
    }
    box(id+" back", [width-2*t,height-2*t,t], [cx,cy,cz-(depth-t)/2], "interior");
    for (let i=1;i<bays;i++) box(id+" divider "+i,[t,height-2*t,depth-t],[cx-width/2+width*i/bays,cy,cz]);
    for (let i=1;i<=levels;i++) box(id+" shelf "+i,[width-2*t,t,depth-2*t],[cx,floor+height*i/(levels+1),cz],"interior");
    if (doors && !open) for (let i=0;i<bays;i++) {
      const bx=cx-width/2+width*(i+0.5)/bays;
      box("door "+id+i,[width/bays-0.005,height-0.006,t],[bx,cy,front-t/2]);
      box("pull "+id+i,[0.085,0.013,0.02],[bx,cy+height*0.3,front+0.01],"hardware");
    }
  }
  function deskTop(height: number) {
    box("tabletop",[w,0.038,z],[0,height-0.019,0]);
    for (const x of [-1,1]) for (const side of [-1,1])
      box("leg "+x+" "+side,[0.05,height-0.038,0.05],[x*(w/2-0.06),(height-0.038)/2,side*(z/2-0.06)]);
  }
  switch (d.kind) {
    case "kitchen": {
      const base = h*0.40, upper=h*0.29, upperDepth=z*0.55;
      shelves("base",w,base,z-0.04,0,base/2,0,d.bays,1,true);
      box("counter",[w,0.04,z],[0,base+0.02,0],"interior");
      shelves("upper",w,upper,upperDepth,0,h-upper/2,-(z-upperDepth)/2,d.bays,1,true);
      break;
    }
    case "bed":
      box("platform",[w,h*0.32,z],[0,h*0.16,0]);
      box("headboard",[w,h,0.045],[0,h/2,-z/2+0.0225]);
      box("mattress",[w*0.95,h*0.17,z-0.11],[0,h*0.405,0.026],"interior");
      break;
    case "desk": case "dining": case "vanity": {
      const top = d.kind==="vanity"?h*0.47:h;
      deskTop(top);
      if(d.kind!=="dining") shelves("pedestal",w*0.30,top*0.83,z*0.84,w*0.30,top*0.415,0,1,2,true);
      if(d.kind==="vanity") {
        box("mirror frame",[w*0.7,h-top,t],[0,(top+h)/2,-z/2+t/2]);
        box("mirror",[w*0.7-0.05,h-top-0.05,0.004],[0,(top+h)/2,-z/2+t+0.002],"hardware");
      }
      break;
    }
    case "partition":
      for(const side of [-1,1]) box("frame "+side,[w,t,z],[0,h/2+side*(h-t)/2,0]);
      for(let i=0;i<d.bays*4;i++) box("slat "+i,[w/(d.bays*9),h-2*t,z*0.55],[-w/2+(i+0.5)*w/(d.bays*4),h/2,0]);
      break;
    case "nightstand": {
      shelves("case",w,h,z,0,h/2,0,1,d.bays-1,false);
      if(!open) for(let i=0;i<d.bays;i++) {
        const y=(i+0.5)*h/d.bays;
        box("door drawer "+i,[w-0.005,h/d.bays-0.006,t],[0,y,(z-t)/2]);
        box("pull drawer "+i,[0.08,0.013,0.014],[0,y,z/2+0.007],"hardware");
      }
      break;
    }
    case "media":
      shelves("left",w*0.30,h,z,-w*0.35,h/2,0,1,1,true);
      shelves("display",w*0.40,h,z,0,h/2,0,1,1,false);
      shelves("right",w*0.30,h,z,w*0.35,h/2,0,1,1,true);
      break;
    default:
      shelves("case",w,h,z,0,h/2,0,d.bays,d.kind==="shelves"?4:d.kind==="shoes"?3:1,d.kind!=="shelves");
  }
  return parts;
}

export interface Product {
  key: string;
  title: string;
  category: string;
  design: Design;
}
function product(key: string, kind: FurnitureKind, title: string, category: string, options: Partial<Design> = {}): Product {
  return { key, title, category, design: { ...newDesign(kind), ...options, product: key } };
}
export const products = [
  product("studio-wardrobe","wardrobe","Studio wardrobe","Wardrobes"),
  product("arch-marble-tv","archTv","Marble arch TV unit","TV units"),
  product("halo-tv-wall","haloTv","Halo TV wall","TV units"),
  product("wave-tv-wall","waveTv","Sculpted wave TV wall","TV units"),
  product("glow-tv-wall","glowTv","Glow frame TV wall","TV units"),
  product("marble-slat-wall","marbleSlat","Marble & slat wall","Wall panels"),
  product("nero-feature-wall","neroWall","Nero feature wall","Wall panels"),
  product("fluted-stone-wall","flutedStone","Fluted stone wall","Wall panels",{bays:3}),
  product("gold-inlay-wall","slabGold","Gold inlay marble wall","Wall panels",{bays:3}),
  product("niche-slat-wall","nicheSlat","Slatted niche wall","Wall panels",{bays:3}),
  product("arch-niche-shelving","archShelves","Arch niche shelving","Wall panels"),
  product("arch-mirror-partition","archMirror","Arch mirror partition","Partitions",{bays:2}),
  product("lattice-archway","jaaliArch","Lattice archway","Partitions"),
  product("niche-archway","nicheArch","Niche archway","Partitions"),
  product("arc-dressing-wardrobe","arcWardrobe","Arc dressing wardrobe","Wardrobes"),
  product("gloss-window-wardrobe","glossWardrobe","Gloss window wardrobe","Wardrobes"),
  product("galley-kitchen","kitchen","Galley kitchen","Kitchens"),
  product("media-console","media","Low media console","Living"),
  product("platform-bed","bed","Oak platform bed","Bedroom",{finish:12073}),
  product("writing-desk","desk","Writing desk","Office"),
  product("oak-sideboard","cabinet","Oak sideboard","Storage",{finish:12079}),
  product("library-bookcase","shelves","Library bookcase","Shelving"),
  product("dressing-vanity","vanity","Dressing vanity","Bedroom"),
  product("family-dining","dining","Family dining table","Dining"),
  product("shoe-cabinet","shoes","Entry shoe cabinet","Storage"),
  product("slat-divider","partition","Slatted room divider","Living"),
  product("bedside-drawers","nightstand","Bedside drawers","Bedroom",{bays:2}),
  product("four-door-wardrobe","wardrobe","Four-door wardrobe","Wardrobes",{width:2600,bays:4,finish:12077}),
  product("compact-kitchen","kitchen","Compact kitchen","Kitchens",{width:1850,bays:2,finish:9033}),
  product("tv-bench","media","Wide TV bench","Living",{width:2600,height:400,finish:3031}),
  product("single-platform","bed","Single platform bed","Bedroom",{width:1000,depth:2000,height:800,finish:12075}),
  product("executive-desk","desk","Executive desk","Office",{width:1950,depth:850,finish:12076}),
  product("four-bay-credenza","cabinet","Four-bay credenza","Storage",{width:2250,bays:4,finish:9013}),
  product("display-shelves","shelves","Narrow display shelves","Shelving",{width:750,bays:2,finish:12073}),
  product("compact-vanity","vanity","Compact vanity","Bedroom",{width:800,finish:12075}),
  product("apartment-table","dining","Apartment dining table","Dining",{width:1200,depth:700,finish:12075}),
  product("hall-storage","shoes","Wide hallway cabinet","Storage",{width:1450,bays:4,finish:9501}),
  product("privacy-screen","partition","Tall privacy screen","Living",{width:1650,height:2500,bays:4,finish:12076}),
  product("three-drawer-nightstand","nightstand","Three-drawer nightstand","Bedroom",{height:650,finish:9018}),
];
