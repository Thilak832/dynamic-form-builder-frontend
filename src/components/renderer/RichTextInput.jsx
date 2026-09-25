import { useEffect, useRef } from 'react'

const ALLOWED = new Set(['B', 'STRONG', 'I', 'EM', 'U', 'UL', 'OL', 'LI', 'BR', 'P', 'DIV'])

/** Keeps only basic formatting tags and strips every attribute. */
export function sanitize(html) {
  const doc = new DOMParser().parseFromString(`<div>${html || ''}</div>`, 'text/html')
  const walk = (node) => {
    for (const child of [...node.childNodes]) {
      if (child.nodeType === Node.ELEMENT_NODE) {
        if (!ALLOWED.has(child.tagName)) {
          child.replaceWith(...child.childNodes)
          walk(node)
          return
        }
        for (const attr of [...child.attributes]) child.removeAttribute(attr.name)
        walk(child)
      } else if (child.nodeType !== Node.TEXT_NODE) {
        child.remove()
      }
    }
  }
  const root = doc.body.firstChild
  walk(root)
  return root.innerHTML
}

export default function RichTextInput({ value, onChange, placeholder, invalid }) {
  const ref = useRef(null)

  useEffect(() => {
    if (ref.current && ref.current.innerHTML !== (value || '')) ref.current.innerHTML = sanitize(value)
    // sync only from outside changes (initial load / resume)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const exec = (cmd) => {
    document.execCommand(cmd)
    ref.current.focus()
    onChange(sanitize(ref.current.innerHTML))
  }

  return (
    <div className={`rounded-lg border ${invalid ? 'border-red-400' : 'border-slate-300'} bg-white focus-within:ring-2 focus-within:ring-brand-200`}>
      <div className="flex gap-1 border-b border-slate-200 px-2 py-1">
        {[['bold', 'B', 'font-bold'], ['italic', 'I', 'italic'], ['underline', 'U', 'underline'],
          ['insertUnorderedList', '•', ''], ['insertOrderedList', '1.', '']].map(([cmd, label, cls]) => (
          <button key={cmd} type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => exec(cmd)}
            className={`h-7 w-7 rounded text-sm hover:bg-slate-100 ${cls}`}>{label}</button>
        ))}
      </div>
      <div
        ref={ref}
        contentEditable
        role="textbox"
        aria-multiline="true"
        data-placeholder={placeholder || 'Start typing...'}
        className="rich-editor min-h-[110px] px-3 py-2 text-sm focus:outline-none"
        onInput={(e) => onChange(sanitize(e.currentTarget.innerHTML))}
      />
    </div>
  )
}
