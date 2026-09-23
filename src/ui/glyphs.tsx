// Line-drawn pictograms for the stream-check answers. 48×48 grid, 2px stroke,
// currentColor, so they inherit the card colour and work in any theme.
import type { ReactNode } from "react";

const wave = (y: number, amp = 3, from = 4, to = 44) => {
  let d = `M${from} ${y}`;
  for (let x = from; x < to; x += 8) d += ` q2 ${-amp} 4 0 t4 0`;
  return d;
};

const G: Record<string, ReactNode> = {
  // water_flow
  "water_flow:FAS": <><path d={wave(18, 5)} /><path d={wave(28, 5)} /><path d="M34 36h8m-3-3 3 3-3 3" /></>,
  "water_flow:NOR": <><path d={wave(20, 2)} /><path d={wave(29, 2)} /></>,
  "water_flow:STA": <><ellipse cx="17" cy="26" rx="10" ry="4" /><ellipse cx="34" cy="31" rx="7" ry="3" /><path d="M8 38h32" opacity=".5" /></>,
  "water_flow:DRY": <><path d="M4 30h40" /><path d="M12 30l4 6 -3 4M26 30l-2 5 4 5M36 30l3 4" /></>,
  // water_color
  "water_color:CL": <><path d="M24 8c7 9 11 15 11 21a11 11 0 0 1-22 0c0-6 4-12 11-21z" /><path d="M36 10l2 3 3 1-3 1-2 3-1-3-3-1 3-1z" /></>,
  "water_color:MU": <><path d="M24 8c7 9 11 15 11 21a11 11 0 0 1-22 0c0-6 4-12 11-21z" /><path d="M14 30h20" /><circle cx="19" cy="35" r="1" /><circle cx="26" cy="36" r="1" /><circle cx="30" cy="32" r="1" /></>,
  "water_color:FO": <><circle cx="16" cy="26" r="5" /><circle cx="27" cy="22" r="6" /><circle cx="33" cy="31" r="4" /><circle cx="22" cy="33" r="3" /><path d={wave(40, 2)} /></>,
  "water_color:CO": <><path d="M24 8c7 9 11 15 11 21a11 11 0 0 1-22 0c0-6 4-12 11-21z" /><path d="M18 30c3-4 9 2 12-3" /></>,
  // channel_type
  "channel_type:NAT": <><path d="M4 16c6 0 8 20 20 20s14-20 20-20" /><circle cx="19" cy="33" r="1.6" /><circle cx="26" cy="34" r="1.6" /><circle cx="31" cy="31" r="1.2" /></>,
  "channel_type:ART": <><path d="M4 16h8v20h24V16h8" /><path d="M12 22l-4 4M12 30l-4 4M36 22l4 4M36 30l4 4M16 36l-4 4M24 36l-4 4M32 36l-4 4" /></>,
  // channel_form
  "channel_form:FLAT": <><path d="M4 18l8 12h24l8-12" /><path d={wave(26, 1.5, 12, 36)} /></>,
  "channel_form:U": <><path d="M8 12v10a16 16 0 0 0 32 0V12" /><path d={wave(28, 1.5, 11, 37)} /></>,
  "channel_form:V": <><path d="M6 12l18 26 18-26" /><path d="M16 27h16" /></>,
  // bank_type
  "bank_type:NAT": <><path d="M4 40c10-2 16-14 26-20h14" /><path d="M14 34v-4m3 3 1-4m16-9v-4m3 3 1-4" /></>,
  "bank_type:ART": <><path d="M20 8v32M20 40h24" /><path d="M20 14l-6 6M20 22l-6 6M20 30l-6 6" /><path d={wave(34, 1.5, 22, 44)} /></>,
  "bank_type:LAS": <><rect x="10" y="30" width="10" height="8" rx="3" /><rect x="21" y="30" width="10" height="8" rx="3" /><rect x="15" y="21" width="10" height="8" rx="3" /><rect x="20" y="12" width="9" height="8" rx="3" /><path d={wave(40, 1.5, 32, 44)} /></>,
  // habitats
  "habitats:SB": <><path d={wave(22, 2)} /><path d="M4 34c8-6 18-6 26 0" /><circle cx="12" cy="31" r=".8" /><circle cx="18" cy="30" r=".8" /><circle cx="24" cy="31" r=".8" /></>,
  "habitats:SI": <><path d={wave(18, 2)} /><path d={wave(36, 2)} /><ellipse cx="24" cy="27" rx="10" ry="4" /></>,
  "habitats:SD": <><path d="M8 36c0-5 4-8 8-8s7 3 7 8zM22 36c0-6 5-10 10-10s9 4 9 10z" /><path d={wave(20, 2)} /></>,
  "habitats:RF": <><path d="M6 14h12v10h12v10h12" /><path d="M18 24c1 3 1 6 0 8M30 34c1 2 1 4 0 6" /></>,
  "habitats:AV": <><path d={wave(24, 2)} /><path d="M24 42V20c0-6 4-9 8-10M24 30c-4-2-8-2-10 0M24 24c3-3 7-3 9-1" /></>,
  // fallen_biomass
  "fallen_biomass:FT": <><rect x="6" y="22" width="36" height="9" rx="4.5" /><ellipse cx="38" cy="26.5" rx="2" ry="3.5" /><path d="M14 22l-4-6M24 22l2-7" /></>,
  "fallen_biomass:FB": <><path d="M6 36L40 14M16 30l-6-8M26 23l2-9M32 19l8 2" /></>,
  "fallen_biomass:FL": <><path d="M10 38c0-14 10-26 28-28 0 18-12 28-28 28z" /><path d="M10 38L32 16" /></>,
  // vegetation
  "vegetation:H": <><path d="M8 40h32" /><path d="M14 40c0-6-2-10-5-12M18 40c0-8 2-12 5-14M26 40c0-7-1-10-3-13M32 40c0-6 3-9 6-10" /></>,
  "vegetation:B": <><path d="M8 40h32" /><path d="M12 40c-4-8 2-16 10-14 2-6 12-6 14 2 6 2 6 10 2 12z" /></>,
  "vegetation:T": <><path d="M8 42h32M24 42V28" /><circle cx="24" cy="18" r="11" /></>,
  // draining pipes
  "draining_pipes:NO": <><path d="M4 18h14c6 0 8 22 26 22" /><path d="M10 12l28 28" opacity=".45" /></>,
  "draining_pipes:DRY_PIPE": <><path d="M4 18h14c6 0 8 22 26 22" /><circle cx="14" cy="18" r="5" /></>,
  "draining_pipes:FLOWING": <><path d="M4 18h14c6 0 8 22 26 22" /><circle cx="14" cy="18" r="5" /><path d="M16 24c1 5 3 8 6 10M12 25c0 4 1 7 3 9" /></>,
  // impervious
  "impervious:NONE": <><path d="M6 36h36" /><path d="M10 36c0-4-1-6-3-7M16 36c0-5 1-7 3-8M30 36c0-4 2-6 4-7M36 36c0-5-1-7-3-8" /></>,
  "impervious:SOME": <><path d="M6 36h36" /><rect x="26" y="22" width="12" height="14" /><path d="M29 26h2m3 0h1m-6 4h2m3 0h1" /><path d="M10 36c0-4-1-6-3-7M16 36c0-5 1-7 3-8" /></>,
  "impervious:MOST": <><path d="M6 38h36" /><rect x="8" y="18" width="12" height="20" /><rect x="22" y="12" width="16" height="26" /><path d="M11 22h2m3 0h1m-6 5h2m3 0h1m8-10h2m4 0h2m-8 6h2m4 0h2m-8 6h2m4 0h2" /></>,
  // overall
  "overall:GOOD": <><path d="M8 26c6-8 18-8 26 0-8 8-20 8-26 0z" /><path d="M34 26l6-5v10z" /><circle cx="15" cy="25" r="1" /></>,
  "overall:MODERATE": <><path d="M8 26c6-8 18-8 26 0-8 8-20 8-26 0z" /><path d="M34 26l6-5v10z" /><path d="M20 20v12" opacity=".5" /></>,
  "overall:POOR": <><path d="M8 26c6-8 18-8 26 0-8 8-20 8-26 0z" /><path d="M34 26l6-5v10z" /><path d="M13 23l4 4m0-4-4 4" /></>,
  // generic
  YES: <><circle cx="24" cy="24" r="16" /><path d="M16 24l6 6 11-12" /></>,
  NO: <><circle cx="24" cy="24" r="16" /><path d="M18 18l12 12m0-12L18 30" /></>,
  UNSURE: <><circle cx="24" cy="24" r="16" /><path d="M19 19a5 5 0 1 1 7 5c-2 1-2 2-2 4" /><circle cx="24" cy="33" r=".8" /></>,
  NONE: <><circle cx="24" cy="24" r="14" /><path d="M14 34L34 14" /></>,
};

export function glyphKey(questionId: string, code: string): string {
  if (questionId.startsWith("vegetation_")) return `vegetation:${code}`;
  if (G[`${questionId}:${code}`]) return `${questionId}:${code}`;
  return code; // YES / NO / UNSURE / NONE
}

export function Glyph({ k, size = 40 }: { k: string; size?: number }) {
  const g = G[k];
  if (!g) return null;
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="glyph">
      {g}
    </svg>
  );
}

/** The StreamKeepers mark: three currents inside a ring. */
export function Mark({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" aria-hidden="true">
      <circle cx="24" cy="24" r="20" />
      <path d={wave(18, 3, 10, 38)} />
      <path d={wave(25, 3, 10, 38)} />
      <path d={wave(32, 3, 10, 38)} />
    </svg>
  );
}

/** Decorative contour lines for headers. */
export function Contours({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 400 120" preserveAspectRatio="none" fill="none" stroke="currentColor" strokeWidth="1" aria-hidden="true">
      {[0, 1, 2, 3, 4, 5, 6].map((i) => (
        <path key={i} d={`M-10 ${22 + i * 14} C 60 ${6 + i * 14}, 120 ${40 + i * 14}, 200 ${24 + i * 14} S 330 ${8 + i * 14}, 410 ${30 + i * 14}`} />
      ))}
    </svg>
  );
}
