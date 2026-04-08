/**
 * 클라이언트에서 호출하는 API 래퍼.
 * dev 모드에선 실서버를, prod 모드에선 빌드 시 export된 scene.json을 사용.
 */

import type { Scene, ElementRow, KeyframeRow, AssetRow } from './types'

const BASE = '/api'

export async function fetchScene(): Promise<Scene> {
  // prod 빌드에선 정적 scene.json 시도, 실패하면 API
  if (import.meta.env.PROD) {
    const res = await fetch('/scene.json')
    if (res.ok) return res.json()
  }
  const res = await fetch(`${BASE}/scene`)
  if (!res.ok) throw new Error(`fetchScene: ${res.status}`)
  return res.json()
}

export async function upsertElement(input: Partial<ElementRow> & { id: string }): Promise<ElementRow> {
  const res = await fetch(`${BASE}/elements`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  if (!res.ok) throw new Error(`upsertElement: ${res.status}`)
  return res.json()
}

export async function deleteElement(id: string): Promise<void> {
  const res = await fetch(`${BASE}/elements/${encodeURIComponent(id)}`, { method: 'DELETE' })
  if (!res.ok) throw new Error(`deleteElement: ${res.status}`)
}

export async function upsertKeyframe(
  input: Partial<KeyframeRow> & { element_id: string; step: number },
): Promise<KeyframeRow> {
  const res = await fetch(`${BASE}/keyframes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  if (!res.ok) throw new Error(`upsertKeyframe: ${res.status}`)
  return res.json()
}

export async function deleteKeyframe(elementId: string, step: number): Promise<void> {
  const res = await fetch(
    `${BASE}/keyframes/${encodeURIComponent(elementId)}/${step}`,
    { method: 'DELETE' },
  )
  if (!res.ok) throw new Error(`deleteKeyframe: ${res.status}`)
}

export async function setMeta(key: string, value: string): Promise<void> {
  const res = await fetch(`${BASE}/meta`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ key, value }),
  })
  if (!res.ok) throw new Error(`setMeta: ${res.status}`)
}

export async function uploadAsset(file: File): Promise<AssetRow> {
  // 이미지 dimensions 측정
  const dims = await readImageDimensions(file).catch(() => null)
  const buf = await file.arrayBuffer()
  const headers: Record<string, string> = {
    'Content-Type': file.type || 'application/octet-stream',
    'X-Filename': file.name,
    'X-Mime-Type': file.type || 'application/octet-stream',
  }
  if (dims) {
    headers['X-Width'] = String(dims.width)
    headers['X-Height'] = String(dims.height)
  }
  const res = await fetch(`${BASE}/assets`, {
    method: 'POST',
    headers,
    body: buf,
  })
  if (!res.ok) throw new Error(`uploadAsset: ${res.status}`)
  return res.json()
}

export async function deleteAsset(id: string): Promise<void> {
  const res = await fetch(`${BASE}/assets/${encodeURIComponent(id)}`, { method: 'DELETE' })
  if (!res.ok) throw new Error(`deleteAsset: ${res.status}`)
}

function readImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) return reject(new Error('not an image'))
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight })
      URL.revokeObjectURL(url)
    }
    img.onerror = (e) => {
      reject(e)
      URL.revokeObjectURL(url)
    }
    img.src = url
  })
}
