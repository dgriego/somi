"use client";

import {
  ArrowRight,
  CalendarBlank,
  Camera,
  Check,
  FilmStrip,
  Heart,
  MapPin,
  PawPrint,
  PencilSimple,
  Plus,
  Trash,
  X,
} from "@phosphor-icons/react";
import { FormEvent, useEffect, useMemo, useState } from "react";

type MediaKind = "image" | "video";

type MemoryMedia = {
  id: string;
  blob: Blob;
  kind: MediaKind;
  name: string;
};

type MemoryRecord = {
  id: string;
  date: string;
  title: string;
  body: string;
  location?: string;
  mediaItems?: MemoryMedia[];
  // Legacy fields from the first version. These are migrated when the item is next saved.
  media?: Blob;
  mediaKind?: MediaKind;
  mediaName?: string;
  createdAt: number;
};

type MemoryMediaView = Omit<MemoryMedia, "blob"> & { url: string };
type MemoryView = MemoryRecord & { mediaViews: MemoryMediaView[] };

const DB_NAME = "somi-journal";
const STORE_NAME = "memories";

const seedMemories = [
  {
    id: "rescue",
    date: "Before September 2026",
    kicker: "Korea",
    title: "His story changed",
    body:
      "Somi is a one-year-old golden retriever who was rescued in Korea. Before rescue, he was at risk of being sold into the dog meat trade. Golden Bond Retriever Rescue helped give him a different path forward.",
    icon: "heart",
    rescueLink: true,
  },
  {
    id: "first-things",
    date: "September 8, 2026",
    kicker: "What we know so far",
    title: "Friendly, social, golden",
    body:
      "The first notes about Somi are simple and very promising: he is friendly with people, he likes other dogs, and he already looks like a professional heart-stealer.",
    icon: "paw",
  },
  {
    id: "homecoming",
    date: "September 13, 2026",
    kicker: "Portland, Oregon",
    title: "Homecoming day",
    body:
      "Pickup day. This is where the next part of Somi's story begins: new routines, new smells, new favorite places, and a lot of firsts worth remembering.",
    icon: "home",
    upcoming: true,
  },
];

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function listMemories(): Promise<MemoryRecord[]> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const request = tx.objectStore(STORE_NAME).getAll();
    request.onsuccess = () => {
      const rows = (request.result as MemoryRecord[]).sort((a, b) =>
        a.date.localeCompare(b.date),
      );
      resolve(rows);
    };
    request.onerror = () => reject(request.error);
    tx.oncomplete = () => db.close();
  });
}

async function saveMemory(memory: MemoryRecord) {
  const db = await openDb();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put(memory);
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => reject(tx.error);
  });
}

async function removeMemory(id: string) {
  const db = await openDb();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).delete(id);
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => reject(tx.error);
  });
}

function normalizeMedia(memory: MemoryRecord): MemoryMedia[] {
  if (memory.mediaItems?.length) return memory.mediaItems;
  if (!memory.media) return [];
  return [
    {
      id: `${memory.id}-legacy-media`,
      blob: memory.media,
      kind: memory.mediaKind || (memory.media.type.startsWith("video/") ? "video" : "image"),
      name: memory.mediaName || memory.title,
    },
  ];
}

function prettyDate(value: string) {
  const parsed = new Date(`${value}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(parsed);
}

export default function Home() {
  const [memories, setMemories] = useState<MemoryView[]>([]);
  const [composerOpen, setComposerOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [date, setDate] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [location, setLocation] = useState("");
  const [mediaDrafts, setMediaDrafts] = useState<MemoryMedia[]>([]);

  async function refreshMemories() {
    const rows = await listMemories();
    setMemories((current) => {
      current.forEach((item) => item.mediaViews.forEach((media) => URL.revokeObjectURL(media.url)));
      return rows.map((item) => ({
        ...item,
        mediaViews: normalizeMedia(item).map((media) => ({
          id: media.id,
          kind: media.kind,
          name: media.name,
          url: URL.createObjectURL(media.blob),
        })),
      }));
    });
  }

  useEffect(() => {
    refreshMemories().catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const memoryCount = useMemo(() => seedMemories.length + memories.length, [memories.length]);

  function resetComposer() {
    setEditingId(null);
    setDate("");
    setTitle("");
    setBody("");
    setLocation("");
    setMediaDrafts([]);
    setSaved(false);
  }

  function openNewMemory() {
    resetComposer();
    setComposerOpen(true);
  }

  function openEditMemory(memory: MemoryView) {
    setEditingId(memory.id);
    setDate(memory.date);
    setTitle(memory.title);
    setBody(memory.body);
    setLocation(memory.location || "");
    setMediaDrafts(normalizeMedia(memory));
    setSaved(false);
    setComposerOpen(true);
  }

  function closeComposer() {
    setComposerOpen(false);
    resetComposer();
  }

  function addMedia(files: FileList | null) {
    if (!files?.length) return;
    const additions = Array.from(files).map((file) => ({
      id: crypto.randomUUID(),
      blob: file,
      kind: file.type.startsWith("video/") ? ("video" as const) : ("image" as const),
      name: file.name,
    }));
    setMediaDrafts((current) => [...current, ...additions]);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!date || !title.trim() || !body.trim()) return;

    setSaving(true);
    try {
      const existing = editingId ? memories.find((memory) => memory.id === editingId) : undefined;
      await saveMemory({
        id: editingId || crypto.randomUUID(),
        date,
        title: title.trim(),
        body: body.trim(),
        location: location.trim() || undefined,
        mediaItems: mediaDrafts,
        createdAt: existing?.createdAt || Date.now(),
      });
      await refreshMemories();
      setSaved(true);
      window.setTimeout(() => closeComposer(), 650);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm("Delete this memory from Somi's timeline?")) return;
    await removeMemory(id);
    await refreshMemories();
  }

  return (
    <main>
      <header className="site-header">
        <a className="brand" href="#top" aria-label="Somi's Story home">
          <span className="brand-mark"><PawPrint weight="fill" /></span>
          <span>Somi's Story</span>
        </a>
        <nav>
          <a href="#story">Story</a>
          <a href="#timeline">Timeline</a>
          <button className="header-add" onClick={openNewMemory}>
            <Plus weight="bold" /> Add a memory
          </button>
        </nav>
      </header>

      <section className="hero" id="top">
        <div className="hero-copy">
          <div className="eyebrow"><span className="eyebrow-dot" /> Korea <ArrowRight /> Portland</div>
          <h1>Hi, I'm <span>Somi.</span></h1>
          <p className="hero-lede">
            One golden retriever, one very big change, and a growing collection of the little moments that make a life.
          </p>
          <div className="profile-pills" aria-label="Somi profile">
            <span>1 year old</span>
            <span>Golden retriever</span>
            <span>People-friendly</span>
            <span>Dog-friendly</span>
          </div>
          <a className="primary-link" href="#timeline">Follow his story <ArrowRight weight="bold" /></a>
        </div>

        <div className="hero-art" aria-label="Somi photo area">
          <div className="photo-stack photo-stack-back" />
          <div className="photo-stack photo-stack-mid" />
          <div className="hero-photo-placeholder">
            <PawPrint weight="fill" />
            <span>Somi's first photo</span>
            <small>Ready for his real photo</small>
          </div>
          <div className="hero-sticker"><Heart weight="fill" /> rescued in Korea</div>
        </div>
      </section>

      <section className="intro" id="story">
        <p className="section-label">THE BEGINNING</p>
        <div className="intro-grid">
          <h2>A safe place for all the moments that come next.</h2>
          <div>
            <p>
              Somi's life is changing fast. This site is a simple record of the first days, awkward moments, tiny wins, favorite things, and everything that starts to feel like home.
            </p>
            <p>
              The timeline can grow one memory at a time with photos, videos, or just a few words.
            </p>
          </div>
        </div>
      </section>

      <section className="timeline-section" id="timeline">
        <div className="timeline-heading">
          <div>
            <p className="section-label">LIFE, IN ORDER</p>
            <h2>Somi's timeline</h2>
          </div>
          <div className="memory-total"><span>{memoryCount}</span> moments so far</div>
        </div>

        <div className="timeline">
          {seedMemories.map((memory, index) => (
            <article className={`timeline-row ${index % 2 ? "timeline-row-right" : ""}`} key={memory.id}>
              <div className="timeline-date">{memory.date}</div>
              <div className={`timeline-node ${memory.upcoming ? "timeline-node-upcoming" : ""}`}>
                {memory.icon === "heart" ? <Heart weight="fill" /> : <PawPrint weight="fill" />}
              </div>
              <div className={`memory-card ${memory.upcoming ? "memory-card-upcoming" : ""}`}>
                <div className="memory-card-meta">
                  <span>{memory.kicker}</span>
                  {memory.upcoming && <span className="upcoming-badge">coming up</span>}
                </div>
                <h3>{memory.title}</h3>
                <p>{memory.body}</p>
                {memory.rescueLink && (
                  <a className="rescue-link" href="https://goldenbondrescue.org/" target="_blank" rel="noreferrer">
                    Golden Bond Retriever Rescue <ArrowRight weight="bold" />
                  </a>
                )}
              </div>
            </article>
          ))}

          {memories.map((memory, index) => (
            <article className={`timeline-row ${(seedMemories.length + index) % 2 ? "timeline-row-right" : ""}`} key={memory.id}>
              <div className="timeline-date">{prettyDate(memory.date)}</div>
              <div className="timeline-node"><PawPrint weight="fill" /></div>
              <div className="memory-card user-memory-card">
                {memory.mediaViews.length > 0 && (
                  <div className={`media-grid ${memory.mediaViews.length === 1 ? "media-grid-single" : ""}`}>
                    {memory.mediaViews.map((media) => (
                      <div className="media-tile" key={media.id}>
                        {media.kind === "image" ? (
                          <img src={media.url} alt={media.name || memory.title} />
                        ) : (
                          <video src={media.url} controls preload="metadata" />
                        )}
                      </div>
                    ))}
                  </div>
                )}
                <div className="memory-card-meta">
                  <span>{memory.location || "Somi's journal"}</span>
                  <span className="memory-actions">
                    <button className="edit-memory" onClick={() => openEditMemory(memory)} aria-label={`Edit ${memory.title}`}>
                      <PencilSimple />
                    </button>
                    <button className="delete-memory" onClick={() => handleDelete(memory.id)} aria-label={`Delete ${memory.title}`}>
                      <Trash />
                    </button>
                  </span>
                </div>
                <h3>{memory.title}</h3>
                <p>{memory.body}</p>
              </div>
            </article>
          ))}

          <div className="timeline-end">
            <div className="timeline-node timeline-node-add"><Plus weight="bold" /></div>
            <button className="add-memory-card" onClick={openNewMemory}>
              <span className="add-memory-icon"><Camera /></span>
              <span>
                <strong>Add the next memory</strong>
                <small>Photos, videos, or a quick note</small>
              </span>
              <ArrowRight weight="bold" />
            </button>
          </div>
        </div>
      </section>

      <section className="promise-section">
        <div className="promise-mark"><PawPrint weight="fill" /></div>
        <p>More walks. More naps. More firsts.</p>
        <h2>The best part of the timeline hasn't happened yet.</h2>
      </section>

      <footer>
        <div className="brand footer-brand"><span className="brand-mark"><PawPrint weight="fill" /></span><span>Somi's Story</span></div>
        <p>From Korea to home, one day at a time.</p>
      </footer>

      {composerOpen && (
        <div className="composer-backdrop" role="presentation" onMouseDown={(event) => {
          if (event.target === event.currentTarget) closeComposer();
        }}>
          <section className="composer" role="dialog" aria-modal="true" aria-labelledby="composer-title">
            <button className="composer-close" onClick={closeComposer} aria-label="Close memory form"><X /></button>
            <div className="composer-heading">
              <span>{editingId ? <PencilSimple /> : <PawPrint weight="fill" />}</span>
              <div>
                <p className="section-label">SOMI'S JOURNAL</p>
                <h2 id="composer-title">{editingId ? "Edit memory" : "Add a memory"}</h2>
              </div>
            </div>
            <p className="composer-note">Saved privately in this browser for now. Photos and videos stay on this device.</p>
            <form onSubmit={handleSubmit}>
              <div className="form-row">
                <label>
                  <span><CalendarBlank /> Date</span>
                  <input type="date" value={date} onChange={(event) => setDate(event.target.value)} required />
                </label>
                <label>
                  <span><MapPin /> Place <em>optional</em></span>
                  <input type="text" value={location} onChange={(event) => setLocation(event.target.value)} placeholder="Home, the park, the car..." />
                </label>
              </div>
              <label>
                <span>Title</span>
                <input type="text" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="First walk around the block" required maxLength={80} />
              </label>
              <label>
                <span>What happened?</span>
                <textarea value={body} onChange={(event) => setBody(event.target.value)} placeholder="A few words about the moment..." required rows={5} maxLength={600} />
              </label>

              {mediaDrafts.length > 0 && (
                <div className="media-drafts">
                  {mediaDrafts.map((media) => (
                    <div className="media-draft-item" key={media.id}>
                      <span className="media-draft-icon">{media.kind === "video" ? <FilmStrip /> : <Camera />}</span>
                      <span className="media-draft-name">{media.name}</span>
                      <button type="button" className="remove-media" onClick={() => setMediaDrafts((current) => current.filter((item) => item.id !== media.id))} aria-label={`Remove ${media.name}`}>
                        <X />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <label className="media-picker">
                <input
                  type="file"
                  accept="image/*,video/*"
                  multiple
                  onChange={(event) => {
                    addMedia(event.target.files);
                    event.target.value = "";
                  }}
                />
                <span className="media-picker-icon"><Camera /></span>
                <span>
                  <strong>{mediaDrafts.length ? "Add more photos or videos" : "Add photos or videos"}</strong>
                  <small>Select several at once. You can mix photos and videos.</small>
                </span>
              </label>
              <button className={`save-memory ${saved ? "save-memory-saved" : ""}`} type="submit" disabled={saving}>
                {saved ? <><Check weight="bold" /> Saved</> : saving ? "Saving..." : editingId ? <><Check weight="bold" /> Save changes</> : <><Plus weight="bold" /> Add to Somi's timeline</>}
              </button>
            </form>
          </section>
        </div>
      )}
    </main>
  );
}
