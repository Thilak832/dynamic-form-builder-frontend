import { useRef, useState } from 'react'
import { errorMessage } from '../../api/client'
import { formatBytes } from '../../lib/format'

/**
 * Uploads each chosen file immediately (so large documents don't block "Next"), and
 * stores the returned file references as the answer value.
 * `uploader` is null in preview mode, where files are only recorded locally.
 */
export default function FileInput({ field, value, onChange, uploader }) {
  const inputRef = useRef(null)
  const [uploads, setUploads] = useState([]) // in-flight: {id, name, progress, error}
  const files = Array.isArray(value) ? value : []
  const multiple = field.field_type === 'multi_file'
  const maxFiles = Number(field.config?.max_files || (multiple ? 5 : 1))
  const types = field.config?.validation?.file_types || ['.pdf', '.jpg', '.jpeg', '.png']
  const maxMb = Number(field.config?.validation?.max_size_mb || 5)

  const pick = async (e) => {
    const chosen = [...e.target.files]
    e.target.value = ''
    let current = multiple ? [...files] : []
    if (!multiple && files[0]) {
      if (uploader) await uploader.remove(files[0].file_id).catch(() => null)
      onChange([])
    }

    const limit = multiple ? Math.max(0, maxFiles - current.length) : 1
    for (const file of chosen.slice(0, limit)) {
      const id = `${file.name}-${Date.now()}`
      const ext = `.${file.name.split('.').pop().toLowerCase()}`
      if (!types.includes(ext)) {
        setUploads((u) => [...u, { id, name: file.name, error: `Only ${types.join(', ')} allowed` }])
        continue
      }
      if (file.size > maxMb * 1024 * 1024) {
        setUploads((u) => [...u, { id, name: file.name, error: `File is larger than ${maxMb} MB` }])
        continue
      }
      if (!uploader) {
        current = [...current, { file_id: Date.now(), name: file.name, size: file.size, content_type: file.type }]
        onChange(current)
        continue
      }
      setUploads((u) => [...u, { id, name: file.name, progress: 0 }])
      try {
        const ref = await uploader.upload(file, (progress) => setUploads((u) => u.map((x) => (x.id === id ? { ...x, progress } : x))))
        current = [...current, ref]
        onChange(current)
        setUploads((u) => u.filter((x) => x.id !== id))
      } catch (err) {
        setUploads((u) => u.map((x) => (x.id === id ? { ...x, error: errorMessage(err, 'Upload failed') } : x)))
      }
    }
  }

  const remove = async (ref) => {
    if (uploader) await uploader.remove(ref.file_id).catch(() => null)
    onChange(files.filter((f) => f.file_id !== ref.file_id))
  }

  const canAdd = multiple ? files.length < maxFiles : true

  return (
    <div className="space-y-2">
      {canAdd && (
        <button type="button" onClick={() => inputRef.current.click()}
          className="flex w-full flex-col items-center gap-1 rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 px-4 py-5 text-sm text-slate-600 hover:border-brand-500 hover:bg-brand-50">
          <span className="text-2xl">📎</span>
          <span className="font-medium">{files.length && !multiple ? 'Replace file' : 'Choose file' + (multiple ? 's' : '')}</span>
          <span className="text-xs text-slate-500">{types.join(', ')} · up to {maxMb} MB{multiple ? ` · max ${maxFiles} files` : ''}</span>
        </button>
      )}
      <input ref={inputRef} type="file" hidden multiple={multiple} accept={types.join(',')} onChange={pick} />
      {files.map((f) => (
        <div key={f.file_id} className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm">
          <span>📄</span>
          <span className="flex-1 truncate">{f.name}</span>
          <span className="text-xs text-slate-500">{formatBytes(f.size)}</span>
          <button type="button" className="text-xs text-red-600 hover:underline" onClick={() => remove(f)}>Remove</button>
        </div>
      ))}
      {uploads.map((u) => (
        <div key={u.id} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm">
          <div className="flex items-center justify-between gap-2">
            <span className="truncate">{u.name}</span>
            {u.error
              ? <button type="button" className="text-xs text-slate-500" onClick={() => setUploads((x) => x.filter((y) => y.id !== u.id))}>Dismiss</button>
              : <span className="text-xs text-slate-500">{u.progress}%</span>}
          </div>
          {u.error
            ? <p className="mt-1 text-xs text-red-600">{u.error}</p>
            : <div className="mt-1 h-1.5 rounded bg-slate-100"><div className="bg-theme h-1.5 rounded transition-all" style={{ width: `${u.progress}%` }} /></div>}
        </div>
      ))}
    </div>
  )
}
