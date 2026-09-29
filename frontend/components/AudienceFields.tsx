"use client";

import { ROLES } from "@/lib/permissions";
import { splitList } from "@/lib/format";
import { Field, inputCls } from "./ui";

export interface AudienceState {
  all: boolean;
  roles: string[];
  batches: string; // comma separated ids
  programs: string;
  userIds: string;
  emails: string;
}

export const emptyAudience: AudienceState = { all: false, roles: [], batches: "", programs: "", userIds: "", emails: "" };

export const buildAudience = (a: AudienceState, includeExplicit = false) => ({
  all: a.all,
  roles: a.roles,
  batches: splitList(a.batches),
  programs: splitList(a.programs),
  ...(includeExplicit ? { userIds: splitList(a.userIds), emails: splitList(a.emails) } : {}),
});

interface Props {
  value: AudienceState;
  onChange: (v: AudienceState) => void;
  restricted: boolean; // coordinators: only own batches/programs
  allowExplicit?: boolean; // bulk email: specific users / emails
}

export default function AudienceFields({ value, onChange, restricted, allowExplicit = false }: Props) {
  const set = (patch: Partial<AudienceState>) => onChange({ ...value, ...patch });
  const toggleRole = (r: string) =>
    set({ roles: value.roles.includes(r) ? value.roles.filter((x) => x !== r) : [...value.roles, r] });

  return (
    <div className="space-y-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
      <div className="text-sm font-medium text-slate-800">Audience</div>

      {restricted ? (
        <p className="text-xs text-amber-700">
          As a coordinator you can only target your own batches / programs.
        </p>
      ) : (
        <>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={value.all} onChange={(e) => set({ all: e.target.checked })} />
            Everyone in the organisation
          </label>
          <div>
            <div className="mb-1 text-sm text-slate-700">Roles</div>
            <div className="flex flex-wrap gap-3">
              {ROLES.map((r) => (
                <label key={r} className="flex items-center gap-1.5 text-sm capitalize">
                  <input type="checkbox" checked={value.roles.includes(r)} onChange={() => toggleRole(r)} />
                  {r.replace("_", " ")}
                </label>
              ))}
            </div>
          </div>
        </>
      )}

      <Field label="Batch IDs" hint="Comma separated. Will become a dropdown when the Batch module is ready.">
        <input className={inputCls} value={value.batches} onChange={(e) => set({ batches: e.target.value })} placeholder="64f1c…, 64f1d…" />
      </Field>
      <Field label="Program IDs" hint="Comma separated.">
        <input className={inputCls} value={value.programs} onChange={(e) => set({ programs: e.target.value })} />
      </Field>

      {allowExplicit && !restricted && (
        <>
          <Field label="Specific user IDs" hint="Optional, comma separated.">
            <input className={inputCls} value={value.userIds} onChange={(e) => set({ userIds: e.target.value })} />
          </Field>
          <Field label="Extra email addresses" hint="Optional, comma or new-line separated.">
            <textarea className={inputCls} rows={2} value={value.emails} onChange={(e) => set({ emails: e.target.value })} />
          </Field>
        </>
      )}
    </div>
  );
}
