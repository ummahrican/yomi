import { useRef, useState } from "react";
import type { Prefs } from "@daily-alt/shared";
import type { useSources } from "@/src/hooks/useSources";
import type { useSync } from "@/src/hooks/useSync";
import { exportBackup, importBackup } from "@/src/lib/backup";
import { clearAllLocalData } from "@/src/lib/db";
import { clearMutedAndHidden, type Muted } from "@/src/lib/muted";
import { CloseIcon } from "./icons";

type PrefsValue = Omit<Prefs, "deviceId">;

interface Props {
  open: boolean;
  onClose: () => void;
  prefs: PrefsValue;
  onUpdate: (patch: Partial<PrefsValue>) => void;
  tags: { name: string; count: number }[];
  availableSources: { slug: string; name: string }[];
  sources: ReturnType<typeof useSources>;
  sync: ReturnType<typeof useSync>;
  muted: Muted;
  onUnmuteTag: (t: string) => void;
  onUnmuteSource: (s: string) => void;
  onViewSource: (slug: string, name: string) => void;
  onDataChanged: () => void;
  onDataCleared: () => void;
}

export function SettingsDrawer(props: Props) {
  const { open, prefs, onUpdate, muted, sources } = props;
  const { sync } = props;
  const [feedUrl, setFeedUrl] = useState("");
  const [submitMsg, setSubmitMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [showPhrase, setShowPhrase] = useState(false);
  const [restoreOpen, setRestoreOpen] = useState(false);
  const [restoreInput, setRestoreInput] = useState("");

  const submit = async () => {
    if (!feedUrl.trim()) return;
    setSubmitting(true);
    setSubmitMsg(null);
    const res = await sources.submit(feedUrl.trim());
    setSubmitting(false);
    if (res && res.ok) {
      setSubmitMsg({ ok: true, text: `Added “${res.item.name}” — vote to help it go live.` });
      setFeedUrl("");
    } else {
      setSubmitMsg({ ok: false, text: res ? res.error : "Something went wrong." });
    }
  };

  const onImportFile = async (file: File | undefined) => {
    if (!file) return;
    try {
      await importBackup(file);
      props.onDataChanged();
      setSubmitMsg({ ok: true, text: "Backup imported." });
    } catch (e) {
      setSubmitMsg({ ok: false, text: e instanceof Error ? e.message : "Import failed." });
    }
  };

  const pending = sources.items.filter((s) => s.status === "pending");
  // Full source directory from the API (includes low-frequency sources not
  // currently in the feed); fall back to feed-discovered sources before load.
  const approved = sources.items.filter((s) => s.status === "approved").map((s) => ({ slug: s.slug, name: s.name }));
  const dirSources = (approved.length ? approved : props.availableSources)
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name));

  const toggleInArray = (key: "followedTags" | "disabledSources", value: string) => {
    const set = new Set(prefs[key]);
    set.has(value) ? set.delete(value) : set.add(value);
    onUpdate({ [key]: [...set] } as Partial<PrefsValue>);
  };

  return (
    <>
      <div
        onClick={props.onClose}
        className={`fixed inset-0 z-30 bg-black/30 transition-opacity ${open ? "opacity-100" : "pointer-events-none opacity-0"}`}
      />
      <aside
        className={`fixed right-0 top-0 z-40 h-full w-full max-w-sm overflow-y-auto bg-white p-5 shadow-xl transition-transform dark:bg-zinc-900 ${open ? "translate-x-0" : "translate-x-full"}`}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Settings</h2>
          <button onClick={props.onClose} aria-label="Close" className="rounded-lg p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800">
            <CloseIcon />
          </button>
        </div>

        <Section title="Appearance">
          <Field label="Theme">
            <Segmented
              value={prefs.theme}
              options={[
                ["system", "System"],
                ["light", "Light"],
                ["dark", "Dark"],
              ]}
              onChange={(v) => onUpdate({ theme: v as PrefsValue["theme"] })}
            />
          </Field>
          <Field label="Layout">
            <Segmented
              value={prefs.density}
              options={[
                ["comfortable", "Cards"],
                ["compact", "Compact"],
                ["list", "List"],
              ]}
              onChange={(v) => onUpdate({ density: v as PrefsValue["density"] })}
            />
          </Field>
        </Section>

        {props.tags.length > 0 ? (
          <Section title="Followed topics">
            <p className="mb-2 text-sm text-zinc-500 dark:text-zinc-400">
              Followed topics rank higher in your feed and sit up front in the filter bar.
            </p>
            <div className="flex flex-wrap gap-1.5">
              {props.tags.slice(0, 30).map((t) => {
                const on = prefs.followedTags.includes(t.name);
                return (
                  <button
                    key={t.name}
                    onClick={() => toggleInArray("followedTags", t.name)}
                    className={pill(on)}
                  >
                    {on ? "★ " : "+ "}
                    {t.name}
                  </button>
                );
              })}
            </div>
          </Section>
        ) : null}

        {dirSources.length > 0 ? (
          <Section title="Sources">
            <p className="mb-2 text-sm text-zinc-500 dark:text-zinc-400">
              Click a name to read just that source. Uncheck to hide it from the feed.
            </p>
            <div className="max-h-72 space-y-0.5 overflow-y-auto">
              {dirSources.map((s) => {
                const disabled = prefs.disabledSources.includes(s.slug);
                return (
                  <div key={s.slug} className="flex items-center justify-between rounded-lg px-2 py-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800">
                    <button
                      onClick={() => props.onViewSource(s.slug, s.name)}
                      className="min-w-0 truncate text-left text-sm text-zinc-700 hover:text-emerald-600 dark:text-zinc-300 dark:hover:text-emerald-400"
                    >
                      {s.name}
                    </button>
                    <label className="ml-2 flex shrink-0 cursor-pointer items-center gap-1 text-xs text-zinc-400">
                      <input
                        type="checkbox"
                        checked={!disabled}
                        onChange={() => toggleInArray("disabledSources", s.slug)}
                        className="h-4 w-4 accent-emerald-500"
                      />
                      show
                    </label>
                  </div>
                );
              })}
            </div>
          </Section>
        ) : null}

        <Section title="Community sources">
          <p className="mb-2 text-sm text-zinc-500 dark:text-zinc-400">
            Suggest an RSS/Atom feed. Once it reaches {sources.approveVotes} votes it goes live for everyone.
          </p>
          <div className="flex gap-2">
            <input
              value={feedUrl}
              onChange={(e) => setFeedUrl(e.target.value)}
              placeholder="https://blog.example.com/feed"
              className="flex-1 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-sm outline-none focus:border-emerald-400 dark:border-zinc-800 dark:bg-zinc-800"
            />
            <button
              onClick={submit}
              disabled={submitting}
              className="rounded-lg bg-emerald-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-600 disabled:opacity-50"
            >
              {submitting ? "…" : "Add"}
            </button>
          </div>
          {submitMsg ? (
            <p className={`mt-2 text-xs ${submitMsg.ok ? "text-emerald-600 dark:text-emerald-400" : "text-red-500"}`}>
              {submitMsg.text}
            </p>
          ) : null}

          {pending.length > 0 ? (
            <div className="mt-3 space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Awaiting votes</p>
              {pending.map((s) => (
                <div key={s.id} className="flex items-center justify-between rounded-lg px-2 py-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800">
                  <span className="min-w-0 truncate text-sm text-zinc-700 dark:text-zinc-300">{s.name}</span>
                  <button
                    onClick={() => sources.vote(s.id)}
                    disabled={s.voted}
                    className="ml-2 shrink-0 rounded-md bg-zinc-100 px-2 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-200 disabled:opacity-50 dark:bg-zinc-700 dark:text-zinc-200"
                  >
                    {s.voted ? "✓ voted" : "▲ vote"} {s.votes}/{sources.approveVotes}
                  </button>
                </div>
              ))}
            </div>
          ) : null}
        </Section>

        {muted.tags.length > 0 || muted.sources.length > 0 ? (
          <Section title="Muted">
            <div className="flex flex-wrap gap-1.5">
              {muted.sources.map((s) => (
                <button key={`s-${s}`} onClick={() => props.onUnmuteSource(s)} className={mutedChip()}>
                  {s} ✕
                </button>
              ))}
              {muted.tags.map((t) => (
                <button key={`t-${t}`} onClick={() => props.onUnmuteTag(t)} className={mutedChip()}>
                  #{t} ✕
                </button>
              ))}
            </div>
            <p className="mt-1 text-xs text-zinc-400">Tap to unmute.</p>
          </Section>
        ) : null}

        <Section title="Sync across devices">
          <p className="mb-2 text-sm text-zinc-500 dark:text-zinc-400">
            No account — a 12-word recovery phrase is your key. Your data is end-to-end encrypted; the
            server only stores ciphertext it can't read.
          </p>

          {!sync.enabled ? (
            <div className="space-y-2">
              <button
                onClick={() => { setShowPhrase(true); void sync.enable(); }}
                disabled={sync.busy}
                className="rounded-lg bg-emerald-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-600 disabled:opacity-50"
              >
                {sync.busy ? "Enabling…" : "Enable sync"}
              </button>
              <button onClick={() => setRestoreOpen((o) => !o)} className="ml-2 text-sm text-emerald-600 hover:underline dark:text-emerald-400">
                Restore from a phrase
              </button>
              {restoreOpen ? (
                <div className="mt-2">
                  <textarea
                    value={restoreInput}
                    onChange={(e) => setRestoreInput(e.target.value)}
                    rows={2}
                    placeholder="Enter your 12-word recovery phrase"
                    className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-800"
                  />
                  <button
                    onClick={async () => { if (await sync.restore(restoreInput)) { setRestoreOpen(false); props.onDataChanged(); } }}
                    disabled={sync.busy}
                    className="mt-1 rounded-lg bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-zinc-900"
                  >
                    Restore
                  </button>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300">
                  Sync on
                </span>
                <button onClick={() => void sync.sync()} disabled={sync.busy} className="rounded-lg border border-zinc-200 px-3 py-1 text-sm hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-700 dark:hover:bg-zinc-800">
                  {sync.busy ? "Syncing…" : "Sync now"}
                </button>
                <button onClick={() => setShowPhrase((s) => !s)} className="text-sm text-emerald-600 hover:underline dark:text-emerald-400">
                  {showPhrase ? "Hide phrase" : "Show phrase"}
                </button>
                <button onClick={() => void sync.disable()} className="ml-auto text-sm text-red-500 hover:underline">
                  Turn off
                </button>
              </div>
            </div>
          )}

          {showPhrase && sync.phrase ? (
            <div className="mt-2 rounded-lg border border-amber-300 bg-amber-50 p-3 dark:border-amber-500/40 dark:bg-amber-500/10">
              <p className="mb-1 text-xs font-semibold text-amber-700 dark:text-amber-300">
                Write this down — it's the only way to restore your data. Anyone with it can read your data.
              </p>
              <code className="block select-all break-words text-sm text-zinc-800 dark:text-zinc-100">{sync.phrase}</code>
              <button
                onClick={() => void navigator.clipboard.writeText(sync.phrase)}
                className="mt-2 rounded-md bg-amber-200 px-2 py-1 text-xs font-medium text-amber-900 hover:bg-amber-300 dark:bg-amber-500/30 dark:text-amber-100"
              >
                Copy
              </button>
            </div>
          ) : null}

          {sync.error ? <p className="mt-2 text-xs text-red-500">{sync.error}</p> : null}
        </Section>

        <Section title="Backup">
          <p className="mb-2 text-sm text-zinc-500 dark:text-zinc-400">
            Sync handles cross-device automatically. Export a file for an offline backup you control.
          </p>
          <div className="flex gap-2">
            <button onClick={() => void exportBackup()} className="rounded-lg border border-zinc-200 px-3 py-1.5 text-sm hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800">
              Export
            </button>
            <button onClick={() => fileRef.current?.click()} className="rounded-lg border border-zinc-200 px-3 py-1.5 text-sm hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800">
              Import
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json"
              className="hidden"
              onChange={(e) => void onImportFile(e.target.files?.[0] ?? undefined)}
            />
          </div>
        </Section>

        <Section title="Privacy">
          <p className="mb-2 text-sm text-zinc-500 dark:text-zinc-400">
            No accounts, no tracking. Bookmarks and preferences live only on this device.
          </p>
          <button
            onClick={async () => {
              await clearAllLocalData();
              await clearMutedAndHidden();
              props.onDataCleared();
            }}
            className="rounded-lg border border-red-200 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 dark:border-red-900 dark:hover:bg-red-950"
          >
            Clear local data
          </button>
        </Section>
      </aside>
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-6">
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">{title}</h3>
      {children}
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-3">
      <p className="mb-1.5 text-sm text-zinc-600 dark:text-zinc-300">{label}</p>
      {children}
    </div>
  );
}

function Segmented({
  value,
  options,
  onChange,
}: {
  value: string;
  options: [string, string][];
  onChange: (v: string) => void;
}) {
  return (
    <div className="inline-flex rounded-lg border border-zinc-200 p-0.5 dark:border-zinc-800">
      {options.map(([v, label]) => (
        <button
          key={v}
          onClick={() => onChange(v)}
          className={`rounded-md px-3 py-1 text-sm transition ${
            value === v
              ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900"
              : "text-zinc-600 dark:text-zinc-300"
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

function mutedChip(): string {
  return "rounded-full bg-zinc-200 px-2.5 py-1 text-sm text-zinc-600 hover:bg-red-100 hover:text-red-600 dark:bg-zinc-700 dark:text-zinc-300 dark:hover:bg-red-500/20 dark:hover:text-red-400";
}

function pill(on: boolean): string {
  return [
    "rounded-full px-2.5 py-1 text-sm transition",
    on
      ? "bg-emerald-500 text-white"
      : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300",
  ].join(" ");
}
