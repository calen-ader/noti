import type { SupabaseClient } from '@supabase/supabase-js';

// What the studio needs from the database: everything you can open, and one call per thing it saves.
// Each save sends the version it started from and gets the new one back, or null if someone else saved first.
export type StudioStore = {
  project(id: string, doc: unknown, published: unknown, version: number, deleted: boolean): Promise<number | null>;
  song(projectId: string, id: string, doc: unknown, version: number, deleted: boolean): Promise<number | null>;
  profile(name: string, doc: unknown): Promise<number>;
  // a project's files: kept in storage under <project>/<file>, opened through a link that lasts an hour
  upload(path: string, file: File): Promise<void>;
  fileUrl(path: string): Promise<string>;
  removeFile(path: string): Promise<void>;
};

export type StudioData = {
  projects: { id: string; doc: unknown; published: unknown; version: number }[];
  songs: { project_id: string; id: string; doc: unknown; version: number }[];
  members: { project_id: string; user_id: string; name: string; role: string }[];
  profile: { name: string; doc: unknown } | null;
};

export async function loadStudio(sb: SupabaseClient, userId: string): Promise<StudioData> {
  const [projects, songs, members, profile] = await Promise.all([
    sb.from('projects').select('id, doc, published, version').is('deleted_at', null).order('created_at'),
    sb.from('project_songs').select('project_id, id, doc, version').is('deleted_at', null),
    sb.from('project_members').select('project_id, user_id, name, role'),
    sb.from('profiles').select('name, doc').eq('user_id', userId).maybeSingle(),
  ]);
  for (const r of [projects, songs, members, profile]) if (r.error) throw r.error;
  return { projects: projects.data ?? [], songs: songs.data ?? [], members: members.data ?? [], profile: profile.data ?? null };
}

export function supabaseStore(sb: SupabaseClient): StudioStore {
  const call = async <T,>(fn: string, args: Record<string, unknown>) => {
    const { data, error } = await sb.rpc(fn, args);
    if (error) throw error;
    return data as T;
  };
  return {
    project: (id, doc, published, version, deleted) =>
      call<number | null>('save_project', { p_id: id, p_doc: doc, p_published: published, p_version: version, p_deleted: deleted }),
    song: (projectId, id, doc, version, deleted) =>
      call<number | null>('save_song', { p_project: projectId, p_id: id, p_doc: doc, p_version: version, p_deleted: deleted }),
    profile: async (name, doc) => {
      await call('save_profile', { p_name: name, p_doc: doc });
      return 1;
    },
    upload: async (path, file) => {
      const { error } = await sb.storage.from('files').upload(path, file, { contentType: file.type, upsert: false });
      if (error) throw error;
    },
    fileUrl: async (path) => {
      const { data, error } = await sb.storage.from('files').createSignedUrl(path, 3600);
      if (error) throw error;
      return data.signedUrl;
    },
    removeFile: async (path) => {
      const { error } = await sb.storage.from('files').remove([path]);
      if (error) throw error;
    },
  };
}

// The same thing kept in this browser only, for /demo: try the studio without an account, and test saving.
type LocalDb = { projects: (StudioData['projects'][number] & { deleted?: boolean })[]; songs: (StudioData['songs'][number] & { deleted?: boolean })[]; profile: StudioData['profile'] };
const LOCAL = 'noti-demo-db';
const readLocal = (): LocalDb => {
  try {
    return JSON.parse(localStorage.getItem(LOCAL) ?? '') as LocalDb;
  } catch {
    return { projects: [], songs: [], profile: null };
  }
};
const writeLocal = (db: LocalDb) => localStorage.setItem(LOCAL, JSON.stringify(db));

export function loadLocal(): StudioData {
  const db = readLocal();
  return { projects: db.projects.filter((p) => !p.deleted), songs: db.songs.filter((s) => !s.deleted), members: [], profile: db.profile };
}

export function localStore(): StudioStore {
  const files = new Map<string, string>(); // in the demo, files stay in this tab only
  return {
    async upload(path, file) {
      files.set(path, URL.createObjectURL(file));
    },
    async fileUrl(path) {
      const u = files.get(path);
      if (!u) throw new Error('Este archivo de prueba ya no está');
      return u;
    },
    async removeFile(path) {
      files.delete(path);
    },
    async project(id, doc, published, version, deleted) {
      const db = readLocal();
      const row = db.projects.find((p) => p.id === id);
      if (version === 0 ? row : row?.version !== version) return null;
      const next = { id, doc, published, version: version + 1, deleted };
      db.projects = row ? db.projects.map((p) => (p.id === id ? next : p)) : [...db.projects, next];
      writeLocal(db);
      return next.version;
    },
    async song(projectId, id, doc, version, deleted) {
      const db = readLocal();
      const row = db.songs.find((s) => s.project_id === projectId && s.id === id);
      if (version === 0 ? row : row?.version !== version) return null;
      const next = { project_id: projectId, id, doc, version: version + 1, deleted };
      db.songs = row ? db.songs.map((s) => (s === row ? next : s)) : [...db.songs, next];
      writeLocal(db);
      return next.version;
    },
    async profile(name, doc) {
      const db = readLocal();
      db.profile = { name, doc };
      writeLocal(db);
      return 1;
    },
  };
}
