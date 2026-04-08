/**
 * SQLite 초기화 및 스키마.
 *
 * - 단일 프로젝트 = 단일 db 파일 (`.omc/presentation.db`)
 * - bun:sqlite 사용 (의존성 0)
 * - 노드 트리 (frame/text/image), 스파스 키프레임, 에셋, 메타
 */

import { Database } from 'bun:sqlite'
import { existsSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'

// bun:sqlite의 db.run/db.query 가변인자에 들어갈 수 있는 값
type SqliteParam = string | number | bigint | boolean | null | Uint8Array

const DB_PATH = resolve(process.cwd(), '.omc/presentation.db')
const LEGACY_DB_PATH = resolve(process.cwd(), '.omc/pptez.db')

let _db: Database | null = null

export function getDb(): Database {
  if (_db) return _db
  mkdirSync(dirname(DB_PATH), { recursive: true })
  // 파일명을 런타임에 옮기지 말고, 기존 presentation.db를 우선 사용한다.
  // 과거 pptez.db만 남아있는 경우엔 그 파일을 그대로 연다.
  const dbPath =
    existsSync(DB_PATH) || !existsSync(LEGACY_DB_PATH) ? DB_PATH : LEGACY_DB_PATH
  const db = new Database(dbPath, { create: true })
  db.exec('PRAGMA journal_mode = WAL;')
  db.exec('PRAGMA foreign_keys = ON;')
  initSchema(db)
  seedDefaults(db)
  _db = db
  return db
}

function initSchema(db: Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS meta (
      key   TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS elements (
      id            TEXT PRIMARY KEY,
      parent_id     TEXT,
      type          TEXT NOT NULL,
      name          TEXT,
      z_index       INTEGER NOT NULL DEFAULT 0,

      -- 정적 속성 (애니메이션 안 됨)
      subtype       TEXT,
      text_content  TEXT,
      text_split    TEXT,
      font_weight   INTEGER,
      text_align    TEXT,
      image_src     TEXT,

      -- Auto layout (frame only)
      layout_mode    TEXT,
      layout_gap     REAL,
      layout_padding REAL,
      layout_align   TEXT,
      layout_justify TEXT,

      -- Stagger modifier
      child_stagger        REAL,
      child_stagger_order  TEXT,
      child_motion_preset  TEXT,

      created_at    INTEGER NOT NULL,
      FOREIGN KEY (parent_id) REFERENCES elements(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_elements_parent ON elements(parent_id);

    CREATE TABLE IF NOT EXISTS keyframes (
      element_id    TEXT NOT NULL,
      step          INTEGER NOT NULL,
      x             REAL,
      y             REAL,
      width         REAL,
      height        REAL,
      opacity       REAL,
      rotate        REAL,
      scale         REAL,
      skew_x        REAL,
      skew_y        REAL,
      bg_color      TEXT,
      fg_color      TEXT,
      border_radius REAL,
      font_size     REAL,
      blur          REAL,
      shadow        TEXT,
      border_width  REAL,
      border_color  TEXT,
      text_content  TEXT,
      duration      REAL,
      ease          TEXT,
      PRIMARY KEY (element_id, step),
      FOREIGN KEY (element_id) REFERENCES elements(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS assets (
      id            TEXT PRIMARY KEY,
      filename      TEXT NOT NULL,
      mime_type     TEXT NOT NULL,
      size          INTEGER NOT NULL,
      width         INTEGER,
      height        INTEGER,
      storage_path  TEXT NOT NULL,
      created_at    INTEGER NOT NULL
    );
  `)

  // 기존 db에 컬럼이 없으면 ALTER TABLE로 추가 (idempotent)
  ensureColumns(db, 'elements', [
    ['subtype', 'TEXT'],
    ['layout_mode', 'TEXT'],
    ['layout_gap', 'REAL'],
    ['layout_padding', 'REAL'],
    ['layout_align', 'TEXT'],
    ['layout_justify', 'TEXT'],
    ['child_motion_preset', 'TEXT'],
  ])
  ensureColumns(db, 'keyframes', [
    ['skew_x', 'REAL'],
    ['skew_y', 'REAL'],
    ['blur', 'REAL'],
    ['shadow', 'TEXT'],
    ['border_width', 'REAL'],
    ['border_color', 'TEXT'],
    ['text_content', 'TEXT'],
    ['duration', 'REAL'],
    ['ease', 'TEXT'],
  ])
}

function ensureColumns(
  db: Database,
  table: string,
  cols: ReadonlyArray<readonly [string, string]>,
) {
  const existing = db.query(`PRAGMA table_info(${table})`).all() as {
    name: string
  }[]
  const have = new Set(existing.map((c) => c.name))
  for (const [name, type] of cols) {
    if (!have.has(name)) {
      db.exec(`ALTER TABLE ${table} ADD COLUMN ${name} ${type}`)
    }
  }
}

function seedDefaults(db: Database) {
  const row = db.query("SELECT value FROM meta WHERE key = 'total_steps'").get() as
    | { value: string }
    | undefined
  if (!row) {
    const insert = db.prepare('INSERT INTO meta (key, value) VALUES (?, ?)')
    insert.run('total_steps', '6')
    insert.run('duration', '0.6')
    insert.run('ease', '[0.22,1,0.36,1]')
  }
}

// ────────────────────────────────────────────────────────────────────────────
// 타입
// ────────────────────────────────────────────────────────────────────────────

export type ElementType = 'frame' | 'text' | 'image'
export type TextSplit = 'none' | 'char' | 'word' | 'line'

export interface ElementRow {
  id: string
  parent_id: string | null
  type: ElementType
  name: string | null
  z_index: number
  subtype: string | null
  text_content: string | null
  text_split: TextSplit | null
  font_weight: number | null
  text_align: string | null
  image_src: string | null
  layout_mode: string | null
  layout_gap: number | null
  layout_padding: number | null
  layout_align: string | null
  layout_justify: string | null
  child_stagger: number | null
  child_stagger_order: string | null
  child_motion_preset: string | null
  created_at: number
}

export interface KeyframeRow {
  element_id: string
  step: number
  x: number | null
  y: number | null
  width: number | null
  height: number | null
  opacity: number | null
  rotate: number | null
  scale: number | null
  skew_x: number | null
  skew_y: number | null
  bg_color: string | null
  fg_color: string | null
  border_radius: number | null
  font_size: number | null
  blur: number | null
  shadow: string | null
  border_width: number | null
  border_color: string | null
  text_content: string | null
  duration: number | null
  ease: string | null
}

export interface AssetRow {
  id: string
  filename: string
  mime_type: string
  size: number
  width: number | null
  height: number | null
  storage_path: string
  created_at: number
}

// ────────────────────────────────────────────────────────────────────────────
// Scene 빌드 — 클라이언트로 보낼 단일 페이로드
// ────────────────────────────────────────────────────────────────────────────

export interface Scene {
  meta: Record<string, string>
  elements: ElementRow[]
  keyframes: KeyframeRow[]
  assets: AssetRow[]
}

export function loadScene(): Scene {
  const db = getDb()
  const meta: Record<string, string> = {}
  for (const row of db.query('SELECT key, value FROM meta').all() as {
    key: string
    value: string
  }[]) {
    meta[row.key] = row.value
  }
  const elements = db
    .query('SELECT * FROM elements ORDER BY z_index ASC')
    .all() as ElementRow[]
  const keyframes = db.query('SELECT * FROM keyframes').all() as KeyframeRow[]
  const assets = db
    .query('SELECT * FROM assets ORDER BY created_at DESC')
    .all() as AssetRow[]
  return { meta, elements, keyframes, assets }
}

// ────────────────────────────────────────────────────────────────────────────
// CRUD
// ────────────────────────────────────────────────────────────────────────────

const ELEMENT_COLUMNS = [
  'id',
  'parent_id',
  'type',
  'name',
  'z_index',
  'subtype',
  'text_content',
  'text_split',
  'font_weight',
  'text_align',
  'image_src',
  'layout_mode',
  'layout_gap',
  'layout_padding',
  'layout_align',
  'layout_justify',
  'child_stagger',
  'child_stagger_order',
  'child_motion_preset',
  'created_at',
] as const

export function upsertElement(input: Partial<ElementRow> & { id: string }): ElementRow {
  const db = getDb()
  const existing = db
    .query('SELECT * FROM elements WHERE id = ?')
    .get(input.id) as ElementRow | undefined

  if (existing) {
    // 부분 업데이트
    const updates: string[] = []
    const values: unknown[] = []
    for (const col of ELEMENT_COLUMNS) {
      if (col === 'id' || col === 'created_at') continue
      if (col in input) {
        updates.push(`${col} = ?`)
        values.push((input as Record<string, unknown>)[col] ?? null)
      }
    }
    if (updates.length > 0) {
      values.push(input.id)
      db.run(
        `UPDATE elements SET ${updates.join(', ')} WHERE id = ?`,
        values as SqliteParam[],
      )
    }
  } else {
    const row: ElementRow = {
      id: input.id,
      parent_id: input.parent_id ?? null,
      type: (input.type ?? 'frame') as ElementType,
      name: input.name ?? null,
      z_index: input.z_index ?? 0,
      subtype: input.subtype ?? null,
      text_content: input.text_content ?? null,
      text_split: (input.text_split ?? null) as TextSplit | null,
      font_weight: input.font_weight ?? null,
      text_align: input.text_align ?? null,
      image_src: input.image_src ?? null,
      layout_mode: input.layout_mode ?? null,
      layout_gap: input.layout_gap ?? null,
      layout_padding: input.layout_padding ?? null,
      layout_align: input.layout_align ?? null,
      layout_justify: input.layout_justify ?? null,
      child_stagger: input.child_stagger ?? null,
      child_stagger_order: input.child_stagger_order ?? null,
      child_motion_preset: input.child_motion_preset ?? null,
      created_at: Date.now(),
    }
    const insertValues = ELEMENT_COLUMNS.map(
      (c) => (row as unknown as Record<string, unknown>)[c] ?? null,
    ) as SqliteParam[]
    db.run(
      `INSERT INTO elements (${ELEMENT_COLUMNS.join(', ')}) VALUES (${ELEMENT_COLUMNS.map(() => '?').join(', ')})`,
      insertValues,
    )
  }
  return db.query('SELECT * FROM elements WHERE id = ?').get(input.id) as ElementRow
}

export function deleteElement(id: string) {
  const db = getDb()
  db.run('DELETE FROM elements WHERE id = ?', [id])
}

const KEYFRAME_COLUMNS = [
  'element_id',
  'step',
  'x',
  'y',
  'width',
  'height',
  'opacity',
  'rotate',
  'scale',
  'skew_x',
  'skew_y',
  'bg_color',
  'fg_color',
  'border_radius',
  'font_size',
  'blur',
  'shadow',
  'border_width',
  'border_color',
  'text_content',
  'duration',
  'ease',
] as const

export function upsertKeyframe(
  input: Partial<KeyframeRow> & { element_id: string; step: number },
): KeyframeRow {
  const db = getDb()
  const existing = db
    .query('SELECT * FROM keyframes WHERE element_id = ? AND step = ?')
    .get(input.element_id, input.step) as KeyframeRow | undefined

  if (existing) {
    const updates: string[] = []
    const values: unknown[] = []
    for (const col of KEYFRAME_COLUMNS) {
      if (col === 'element_id' || col === 'step') continue
      if (col in input) {
        updates.push(`${col} = ?`)
        values.push((input as Record<string, unknown>)[col] ?? null)
      }
    }
    if (updates.length > 0) {
      values.push(input.element_id, input.step)
      db.run(
        `UPDATE keyframes SET ${updates.join(', ')} WHERE element_id = ? AND step = ?`,
        values as SqliteParam[],
      )
    }
  } else {
    const insertValues = KEYFRAME_COLUMNS.map(
      (c) => (input as Record<string, unknown>)[c] ?? null,
    ) as SqliteParam[]
    db.run(
      `INSERT INTO keyframes (${KEYFRAME_COLUMNS.join(', ')}) VALUES (${KEYFRAME_COLUMNS.map(() => '?').join(', ')})`,
      insertValues,
    )
  }
  return db
    .query('SELECT * FROM keyframes WHERE element_id = ? AND step = ?')
    .get(input.element_id, input.step) as KeyframeRow
}

export function deleteKeyframe(elementId: string, step: number) {
  const db = getDb()
  db.run('DELETE FROM keyframes WHERE element_id = ? AND step = ?', [elementId, step])
}

export function setMeta(key: string, value: string) {
  const db = getDb()
  db.run(
    'INSERT INTO meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
    [key, value],
  )
}

// ────────────────────────────────────────────────────────────────────────────
// 에셋
// ────────────────────────────────────────────────────────────────────────────

export function insertAsset(row: Omit<AssetRow, 'created_at'>): AssetRow {
  const db = getDb()
  const existing = db
    .query('SELECT * FROM assets WHERE id = ?')
    .get(row.id) as AssetRow | undefined
  if (existing) return existing
  db.run(
    `INSERT INTO assets (id, filename, mime_type, size, width, height, storage_path, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      row.id,
      row.filename,
      row.mime_type,
      row.size,
      row.width,
      row.height,
      row.storage_path,
      Date.now(),
    ],
  )
  return db.query('SELECT * FROM assets WHERE id = ?').get(row.id) as AssetRow
}

export function deleteAsset(id: string) {
  const db = getDb()
  db.run('DELETE FROM assets WHERE id = ?', [id])
}
