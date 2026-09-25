import { createSlice } from '@reduxjs/toolkit'
import { createField, createPage, newKey } from '../lib/fieldTypes'

// Holds the form currently open in the builder. The whole tree is saved in one
// PUT /forms/{id}/update call, so edits are cheap local reducer updates.

const initialState = {
  form: null,
  pageIndex: 0,
  selectedKey: null, // selected field key; null = page settings
  dirty: false,
  history: [], // undo stack of previous page trees
}

const MAX_HISTORY = 50

function snapshot(state) {
  state.history.push(JSON.stringify(state.form.pages))
  if (state.history.length > MAX_HISTORY) state.history.shift()
  state.dirty = true
}

function findField(state, key) {
  for (let p = 0; p < state.form.pages.length; p++) {
    const i = state.form.pages[p].fields.findIndex((f) => f.key === key)
    if (i !== -1) return { page: p, index: i, field: state.form.pages[p].fields[i] }
  }
  return null
}

/** Drop conditions that point to a field that no longer exists. */
function pruneConditions(pages, removedKeys) {
  const prune = (rule) => {
    if (!rule?.conditions) return rule
    const conditions = rule.conditions.filter((c) => !removedKeys.includes(c.field))
    return conditions.length ? { ...rule, conditions } : null
  }
  for (const page of pages) {
    page.logic = prune(page.logic)
    for (const f of page.fields) {
      if (f.config?.conditional_logic) f.config.conditional_logic = prune(f.config.conditional_logic)
    }
  }
}

const slice = createSlice({
  name: 'builder',
  initialState,
  reducers: {
    loadForm(state, { payload }) {
      const pages = payload.pages.map(({ id, page_number, ...p }) => ({
        ...p,
        fields: p.fields.map(({ id: _id, order, ...f }) => ({ ...f, config: f.config || {} })),
      }))
      state.form = { ...payload, pages }
      state.pageIndex = 0
      state.selectedKey = null
      state.dirty = false
      state.history = []
    },
    markSaved(state, { payload }) {
      if (payload) {
        state.form.status = payload.status
        state.form.version = payload.version
        state.form.has_unpublished_changes = payload.has_unpublished_changes
        state.form.updated_at = payload.updated_at
      }
      state.dirty = false
    },
    setMeta(state, { payload }) {
      Object.assign(state.form, payload)
      state.dirty = true
    },
    setSettings(state, { payload }) {
      state.form.settings = { ...(state.form.settings || {}), ...payload }
      state.dirty = true
    },
    undo(state) {
      const prev = state.history.pop()
      if (!prev) return
      state.form.pages = JSON.parse(prev)
      state.pageIndex = Math.min(state.pageIndex, state.form.pages.length - 1)
      if (state.selectedKey && !findField(state, state.selectedKey)) state.selectedKey = null
      state.dirty = true
    },

    // pages
    selectPage(state, { payload }) {
      state.pageIndex = payload
      state.selectedKey = null
    },
    addPage(state) {
      snapshot(state)
      state.form.pages.push(createPage(state.form.pages.length + 1))
      state.pageIndex = state.form.pages.length - 1
      state.selectedKey = null
    },
    updatePage(state, { payload: { index, patch } }) {
      snapshot(state)
      Object.assign(state.form.pages[index], patch)
    },
    removePage(state, { payload: index }) {
      if (state.form.pages.length <= 1) return
      snapshot(state)
      const [removed] = state.form.pages.splice(index, 1)
      pruneConditions(state.form.pages, removed.fields.map((f) => f.key))
      state.pageIndex = Math.max(0, Math.min(state.pageIndex, state.form.pages.length - 1))
      state.selectedKey = null
    },
    movePage(state, { payload: { from, to } }) {
      if (to < 0 || to >= state.form.pages.length) return
      snapshot(state)
      const [page] = state.form.pages.splice(from, 1)
      state.form.pages.splice(to, 0, page)
      state.pageIndex = to
    },

    // fields
    selectField(state, { payload }) { state.selectedKey = payload },
    addField(state, { payload: { type, index } }) {
      snapshot(state)
      const field = createField(type)
      const fields = state.form.pages[state.pageIndex].fields
      fields.splice(index ?? fields.length, 0, field)
      state.selectedKey = field.key
    },
    updateField(state, { payload: { key, patch } }) {
      const found = findField(state, key)
      if (!found) return
      snapshot(state)
      Object.assign(found.field, patch)
    },
    updateFieldConfig(state, { payload: { key, patch } }) {
      const found = findField(state, key)
      if (!found) return
      snapshot(state)
      found.field.config = { ...(found.field.config || {}), ...patch }
    },
    removeField(state, { payload: key }) {
      const found = findField(state, key)
      if (!found) return
      snapshot(state)
      state.form.pages[found.page].fields.splice(found.index, 1)
      pruneConditions(state.form.pages, [key])
      if (state.selectedKey === key) state.selectedKey = null
    },
    duplicateField(state, { payload: key }) {
      const found = findField(state, key)
      if (!found) return
      snapshot(state)
      const copy = { ...JSON.parse(JSON.stringify(found.field)), key: newKey('field'), label: `${found.field.label} (copy)` }
      state.form.pages[found.page].fields.splice(found.index + 1, 0, copy)
      state.selectedKey = copy.key
    },
    reorderField(state, { payload: { from, to } }) {
      const fields = state.form.pages[state.pageIndex].fields
      if (from === to) return
      snapshot(state)
      const [f] = fields.splice(from, 1)
      fields.splice(to, 0, f)
    },
    moveFieldToPage(state, { payload: { key, pageIndex } }) {
      const found = findField(state, key)
      if (!found || found.page === pageIndex) return
      snapshot(state)
      const [f] = state.form.pages[found.page].fields.splice(found.index, 1)
      state.form.pages[pageIndex].fields.push(f)
      state.pageIndex = pageIndex
    },
    closeBuilder() { return initialState },
  },
})

export const builder = slice.actions
export default slice.reducer

/** Payload for PUT /forms/{id}/update. */
export function serializeForm(form) {
  return {
    name: form.name,
    description: form.description,
    settings: form.settings || {},
    pages: form.pages.map((p) => ({
      key: p.key,
      title: p.title,
      description: p.description,
      show_progress_bar: p.show_progress_bar,
      required_all_fields: p.required_all_fields,
      logic: p.logic,
      fields: p.fields.map((f) => ({
        key: f.key,
        field_type: f.field_type,
        label: f.label,
        placeholder: f.placeholder || null,
        help_text: f.help_text || null,
        required: !!f.required,
        config: f.config || {},
      })),
    })),
  }
}
