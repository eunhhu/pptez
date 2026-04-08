/**
 * Vite plugin: dev 서버에 /api/* 엔드포인트 추가.
 *
 * - GET    /api/scene                    → 전체 scene 페이로드
 * - POST   /api/elements                 → 노드 생성/업데이트 (id 있으면 upsert)
 * - DELETE /api/elements/:id             → 노드 삭제
 * - POST   /api/keyframes                → 키프레임 upsert
 * - DELETE /api/keyframes/:elementId/:step → 키프레임 삭제
 * - POST   /api/meta                     → 메타 키 업데이트
 * - POST   /api/assets                   → 에셋 업로드 (multipart 또는 raw)
 * - DELETE /api/assets/:id               → 에셋 삭제 (파일도 함께)
 */

import type { Plugin, Connect } from 'vite'
import { createHash } from 'node:crypto'
import { mkdirSync, writeFileSync, unlinkSync, existsSync } from 'node:fs'
import { resolve, extname } from 'node:path'
import {
  loadScene,
  upsertElement,
  deleteElement,
  upsertKeyframe,
  deleteKeyframe,
  setMeta,
  insertAsset,
  deleteAsset,
  getDb,
} from './db'

const ASSETS_DIR = resolve(process.cwd(), 'public/assets')

function ensureAssetsDir() {
  mkdirSync(ASSETS_DIR, { recursive: true })
}

function send(res: Parameters<Connect.NextHandleFunction>[1], status: number, body: unknown) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify(body))
}

function sendError(res: Parameters<Connect.NextHandleFunction>[1], status: number, message: string) {
  send(res, status, { error: message })
}

async function readJsonBody(req: Parameters<Connect.NextHandleFunction>[0]): Promise<unknown> {
  return new Promise((resolveBody, reject) => {
    const chunks: Buffer[] = []
    req.on('data', (chunk: Buffer) => chunks.push(chunk))
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8')
      if (!raw) return resolveBody({})
      try {
        resolveBody(JSON.parse(raw))
      } catch (e) {
        reject(e)
      }
    })
    req.on('error', reject)
  })
}

async function readBinaryBody(req: Parameters<Connect.NextHandleFunction>[0]): Promise<Buffer> {
  return new Promise((resolveBody, reject) => {
    const chunks: Buffer[] = []
    req.on('data', (chunk: Buffer) => chunks.push(chunk))
    req.on('end', () => resolveBody(Buffer.concat(chunks)))
    req.on('error', reject)
  })
}

const MIME_TO_EXT: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/svg+xml': 'svg',
}

function extFromFilename(filename: string): string {
  const e = extname(filename).slice(1).toLowerCase()
  return e || 'bin'
}

export function pptezApi(): Plugin {
  return {
    name: 'pptez-api',
    // 빌드 시작 시 scene.json을 public/에 떨어뜨려서 dist에 자동 포함되게 한다.
    // 에셋 파일은 이미 public/assets/에 있으니 vite가 같이 복사한다.
    buildStart() {
      try {
        const scene = loadScene()
        const publicDir = resolve(process.cwd(), 'public')
        mkdirSync(publicDir, { recursive: true })
        writeFileSync(
          resolve(publicDir, 'scene.json'),
          JSON.stringify(scene),
        )
        console.log('[pptez] exported public/scene.json')
      } catch (e) {
        console.warn('[pptez] scene.json export failed:', (e as Error).message)
      }
    },
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = req.url || ''
        if (!url.startsWith('/api/')) return next()

        try {
          // GET /api/scene
          if (req.method === 'GET' && url === '/api/scene') {
            return send(res, 200, loadScene())
          }

          // POST /api/elements
          if (req.method === 'POST' && url === '/api/elements') {
            const body = (await readJsonBody(req)) as Record<string, unknown>
            if (!body.id || typeof body.id !== 'string') {
              return sendError(res, 400, 'id required')
            }
            const row = upsertElement(body as Parameters<typeof upsertElement>[0])
            return send(res, 200, row)
          }

          // DELETE /api/elements/:id
          if (req.method === 'DELETE' && url.startsWith('/api/elements/')) {
            const id = decodeURIComponent(url.slice('/api/elements/'.length))
            deleteElement(id)
            return send(res, 200, { ok: true })
          }

          // POST /api/keyframes
          if (req.method === 'POST' && url === '/api/keyframes') {
            const body = (await readJsonBody(req)) as Record<string, unknown>
            if (!body.element_id || typeof body.element_id !== 'string') {
              return sendError(res, 400, 'element_id required')
            }
            if (typeof body.step !== 'number') {
              return sendError(res, 400, 'step required')
            }
            const row = upsertKeyframe(body as Parameters<typeof upsertKeyframe>[0])
            return send(res, 200, row)
          }

          // DELETE /api/keyframes/:elementId/:step
          if (req.method === 'DELETE' && url.startsWith('/api/keyframes/')) {
            const parts = url.slice('/api/keyframes/'.length).split('/')
            if (parts.length !== 2) return sendError(res, 400, 'bad path')
            const [elementId, stepStr] = parts
            const step = Number(stepStr)
            if (Number.isNaN(step)) return sendError(res, 400, 'bad step')
            deleteKeyframe(decodeURIComponent(elementId), step)
            return send(res, 200, { ok: true })
          }

          // POST /api/meta
          if (req.method === 'POST' && url === '/api/meta') {
            const body = (await readJsonBody(req)) as { key?: string; value?: string }
            if (!body.key || typeof body.value !== 'string') {
              return sendError(res, 400, 'key/value required')
            }
            setMeta(body.key, body.value)
            return send(res, 200, { ok: true })
          }

          // POST /api/assets — raw binary 업로드. 메타는 헤더로:
          //   X-Filename, X-Mime-Type, (선택) X-Width, X-Height
          if (req.method === 'POST' && url === '/api/assets') {
            ensureAssetsDir()
            const filename = String(req.headers['x-filename'] || 'upload.bin')
            const mime = String(req.headers['x-mime-type'] || 'application/octet-stream')
            const widthHdr = req.headers['x-width']
            const heightHdr = req.headers['x-height']
            const width = widthHdr ? Number(widthHdr) : null
            const height = heightHdr ? Number(heightHdr) : null

            const buf = await readBinaryBody(req)
            const hash = createHash('sha256').update(buf).digest('hex').slice(0, 16)
            const ext = MIME_TO_EXT[mime] ?? extFromFilename(filename)
            const storagePath = `assets/${hash}.${ext}`
            const absPath = resolve(process.cwd(), 'public', storagePath)

            if (!existsSync(absPath)) {
              writeFileSync(absPath, buf)
            }

            const row = insertAsset({
              id: hash,
              filename,
              mime_type: mime,
              size: buf.byteLength,
              width,
              height,
              storage_path: '/' + storagePath, // 클라이언트에서 그대로 src로 사용
            })
            return send(res, 200, row)
          }

          // DELETE /api/assets/:id
          if (req.method === 'DELETE' && url.startsWith('/api/assets/')) {
            const id = decodeURIComponent(url.slice('/api/assets/'.length))
            const db = getDb()
            const row = db.query('SELECT * FROM assets WHERE id = ?').get(id) as
              | { storage_path: string }
              | undefined
            if (row) {
              const absPath = resolve(process.cwd(), 'public', row.storage_path.replace(/^\//, ''))
              if (existsSync(absPath)) unlinkSync(absPath)
              deleteAsset(id)
            }
            return send(res, 200, { ok: true })
          }

          return sendError(res, 404, 'not found')
        } catch (e) {
          console.error('[pptez]', e)
          return sendError(res, 500, (e as Error).message)
        }
      })
    },
  }
}
