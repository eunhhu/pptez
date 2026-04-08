/**
 * 에셋 패널.
 *
 * - 파일 드래그 인 → /api/assets 업로드 (sha256 dedup)
 * - 썸네일 그리드
 * - 썸네일 클릭 → 캔버스에 이미지 element 생성
 * - 드래그 → SelectionOverlay 위에서 drop 처리 (여기선 단순화: 클릭 = 추가)
 * - 우클릭/✕ → 삭제
 */

import { useRef, useState } from 'react'
import {
  useScene,
  uploadAsset,
  deleteAsset,
  createElement,
  setSelection,
} from '../scene/store'

export function AssetsPanel() {
  const scene = useScene()
  const [dragOver, setDragOver] = useState(false)
  const [busy, setBusy] = useState(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const onDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragOver(false)
    const files = Array.from(e.dataTransfer.files).filter((f) =>
      f.type.startsWith('image/'),
    )
    if (files.length === 0) return
    setBusy(true)
    try {
      for (const f of files) await uploadAsset(f)
    } finally {
      setBusy(false)
    }
  }

  const onPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    if (files.length === 0) return
    setBusy(true)
    try {
      for (const f of files) await uploadAsset(f)
    } finally {
      setBusy(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const insertAsset = async (url: string, w: number | null, h: number | null) => {
    const aspect = w && h ? w / h : 1
    const targetW = 600
    const targetH = Math.round(targetW / aspect)
    const id = await createElement({
      type: 'image',
      image_src: url,
      width: targetW,
      height: targetH,
      x: 660,
      y: 540 - targetH / 2,
      name: 'Image',
    })
    setSelection([id])
  }

  const assets = scene?.assets ?? []

  return (
    <div
      className={`px-3 py-2 ${dragOver ? 'bg-sky-500/10' : ''}`}
      onDragOver={(e) => {
        e.preventDefault()
        setDragOver(true)
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={onDrop}
    >
      <div className="flex items-center justify-between text-[11px] uppercase tracking-wider text-zinc-500">
        <span>Assets</span>
        <button
          onClick={() => fileInputRef.current?.click()}
          className="rounded bg-white/5 px-2 py-0.5 text-[10px] text-zinc-300 hover:bg-white/10"
          disabled={busy}
        >
          {busy ? '…' : '+ Upload'}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={onPick}
        />
      </div>

      {assets.length === 0 ? (
        <div className="mt-2 rounded border border-dashed border-white/10 px-2 py-4 text-center text-[10px] text-zinc-600">
          Drop images here
        </div>
      ) : (
        <div className="mt-2 grid grid-cols-3 gap-1">
          {assets.map((a) => (
            <div
              key={a.id}
              className="group relative aspect-square overflow-hidden rounded border border-white/10 bg-zinc-950"
            >
              <button
                onClick={() => insertAsset(a.storage_path, a.width, a.height)}
                className="absolute inset-0"
                title={`${a.filename}\n${a.width}×${a.height}`}
              >
                <img
                  src={a.storage_path}
                  alt={a.filename}
                  className="h-full w-full object-cover"
                  draggable={false}
                />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  deleteAsset(a.id)
                }}
                className="absolute right-0.5 top-0.5 hidden rounded bg-black/60 px-1 text-[10px] text-red-400 group-hover:block"
                title="Delete asset"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
