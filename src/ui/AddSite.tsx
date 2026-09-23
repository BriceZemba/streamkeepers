import { useMemo, useState } from "react";
import { distanceM, getPosition } from "../domain/geo";
import { DUPLICATE_RADIUS_M, nameProblem, nearbySite } from "../domain/proposedSites";
import type { SiteFacts } from "../domain/siteFacts";
import { useI18n } from "../i18n";

export interface DraftPos { lat: number; lon: number }

/** Propose a stream: place it (map tap or GPS), name it, and avoid duplicates. */
export function AddSite({ pos, sites, onPos, onSave, onCancel, onOpenExisting }: {
  pos: DraftPos | null;
  sites: SiteFacts[];
  onPos: (p: DraftPos) => void;
  onSave: (name: string) => void;
  onCancel: () => void;
  onOpenExisting: (code: string) => void;
}) {
  const { t, num } = useI18n();
  const [name, setName] = useState("");
  const [locating, setLocating] = useState(false);
  const problem = name.trim() ? nameProblem(name) : null;
  const existing = useMemo(() => (pos ? nearbySite(sites, pos.lat, pos.lon, DUPLICATE_RADIUS_M) : null), [pos, sites]);

  const useGps = async () => {
    setLocating(true);
    const p = await getPosition();
    setLocating(false);
    if (p) onPos({ lat: p.lat, lon: p.lon });
  };

  return (
    <article className="detail add-site" aria-labelledby="add-h">
      <button className="back" onClick={onCancel}>← {t("add.cancel")}</button>
      <h1 id="add-h">{t("add.title")}</h1>
      <p className="small muted" style={{ margin: "6px 0 14px" }}>{t("add.hint")}</p>

      <div className="add-pos">
        <span className={`dot ${pos ? "ok" : ""}`} aria-hidden="true" />
        <span className="small">{pos ? t("add.placed", { lat: pos.lat.toFixed(5), lon: pos.lon.toFixed(5) }) : t("add.tapMap")}</span>
        <button className="btn btn-soft btn-sm" onClick={useGps} disabled={locating}>{locating ? "…" : t("add.useGps")}</button>
      </div>

      {existing && pos && (
        <div className="add-dup" role="alert">
          <p>{t("add.duplicate", { m: num(Math.round(distanceM(pos.lat, pos.lon, existing.lat, existing.lon))), name: existing.name })}</p>
          <button className="btn btn-primary btn-sm" onClick={() => onOpenExisting(existing.code)}>{t("add.openExisting", { name: existing.name })} →</button>
        </div>
      )}

      <label className="field" style={{ marginTop: 14 }}>
        {t("add.name")}
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder={t("add.namePh")} maxLength={80} aria-invalid={!!problem} />
        {problem && <span className="tiny" style={{ color: "var(--rust)", fontWeight: 600 }}>{t(problem)}</span>}
      </label>

      <button className="btn btn-primary btn-block" disabled={!pos || !!existing || !name.trim() || !!problem} onClick={() => onSave(name)}>
        {t("add.save")}
      </button>
    </article>
  );
}
