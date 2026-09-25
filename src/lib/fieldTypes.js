// Field palette definitions (mirror of backend/app/field_types.py plus builder defaults).

const opt = (...labels) => labels.map((label) => ({ label, value: label.toLowerCase().replace(/[\s-]+/g, '_') }))

export const CATEGORIES = [
  { id: 'basic', label: 'Basic' },
  { id: 'datetime', label: 'Date & Time' },
  { id: 'choice', label: 'Choices' },
  { id: 'location', label: 'Location' },
  { id: 'files', label: 'Files & Signature' },
  { id: 'booking', label: 'Booking & Payment' },
  { id: 'layout', label: 'Layout' },
]

export const FIELD_TYPES = {
  text: { label: 'Text Input', icon: 'Aa', category: 'basic', defaults: { label: 'Full Name', placeholder: 'Enter text' } },
  textarea: { label: 'Textarea', icon: '¶', category: 'basic', defaults: { label: 'Special Requests', placeholder: 'Tell us more...' } },
  email: { label: 'Email', icon: '@', category: 'basic', defaults: { label: 'Email', placeholder: 'you@example.com' } },
  phone: { label: 'Phone Number', icon: '☎', category: 'basic', defaults: { label: 'Phone Number', placeholder: '+91 98765 43210' } },
  number: { label: 'Number', icon: '#', category: 'basic', defaults: { label: 'Number of Travellers', config: { validation: { min: 1 } } } },
  password: { label: 'Password', icon: '•••', category: 'basic', defaults: { label: 'Password' } },
  url: { label: 'URL', icon: '🔗', category: 'basic', defaults: { label: 'Website', placeholder: 'https://' } },
  rich_text: { label: 'Rich Text Editor', icon: 'B/', category: 'basic', defaults: { label: 'Itinerary Notes' } },

  date: { label: 'Date', icon: '📅', category: 'datetime', defaults: { label: 'Travel Date', config: { validation: { min_date: 'today' } } } },
  date_range: { label: 'Date Range', icon: '↔', category: 'datetime', defaults: { label: 'Trip Dates', config: { validation: { min_date: 'today' } } } },
  time: { label: 'Time', icon: '🕑', category: 'datetime', defaults: { label: 'Pickup Time' } },

  dropdown: { label: 'Dropdown', icon: '▾', category: 'choice', hasOptions: true, defaults: { label: 'Destination', config: { options: opt('Goa', 'Kerala', 'Bali') } } },
  multi_select: { label: 'Multi-Select', icon: '☷', category: 'choice', hasOptions: true, defaults: { label: 'Activities', config: { options: opt('Scuba Diving', 'Trekking', 'Sightseeing') } } },
  radio: { label: 'Radio Button', icon: '◉', category: 'choice', hasOptions: true, defaults: { label: 'Room Type', config: { options: opt('Standard', 'Deluxe', 'Suite') } } },
  checkbox: { label: 'Checkbox Group', icon: '☑', category: 'choice', hasOptions: true, defaults: { label: 'Add-ons', config: { options: opt('Airport Transfer', 'Travel Insurance', 'Breakfast') } } },
  toggle: { label: 'Toggle', icon: '⏻', category: 'choice', defaults: { label: 'Travelling with children?' } },
  rating: { label: 'Rating', icon: '★', category: 'choice', defaults: { label: 'How excited are you?', config: { max_rating: 5 } } },
  slider: { label: 'Slider', icon: '⎯●', category: 'choice', defaults: { label: 'Budget (INR thousands)', config: { min: 10, max: 500, step: 10 } } },

  address: { label: 'Address', icon: '🏠', category: 'location', defaults: { label: 'Address' } },
  country: { label: 'Country', icon: '🌍', category: 'location', defaults: { label: 'Country' } },
  state: { label: 'State', icon: '🗺', category: 'location', defaults: { label: 'State' } },
  city: { label: 'City', icon: '🏙', category: 'location', defaults: { label: 'City' } },
  postal_code: { label: 'Postal Code', icon: '✉', category: 'location', defaults: { label: 'Postal Code' } },

  file: { label: 'File Upload', icon: '📎', category: 'files', defaults: { label: 'Passport Scan', config: { validation: { file_types: ['.pdf', '.jpg', '.jpeg', '.png'], max_size_mb: 5 } } } },
  multi_file: { label: 'Multiple Files', icon: '🗂', category: 'files', defaults: { label: 'Travel Documents', config: { max_files: 5, validation: { file_types: ['.pdf', '.jpg', '.jpeg', '.png'], max_size_mb: 5 } } } },
  signature: { label: 'Signature Pad', icon: '✍', category: 'files', defaults: { label: 'Signature' } },

  currency: { label: 'Currency', icon: '₹', category: 'booking', defaults: { label: 'Budget', config: { currency: 'INR' } } },
  payment: { label: 'Payment Info', icon: '💳', category: 'booking', defaults: { label: 'Booking Deposit', required: true, config: { amount: 5000, currency: 'INR', description: 'Advance payment' } } },
  social: { label: 'Social Media Handle', icon: '#@', category: 'booking', defaults: { label: 'Instagram Handle', placeholder: '@traveller' } },
  terms: { label: 'Terms & Conditions', icon: '✓', category: 'booking', defaults: { label: 'I agree to the terms and conditions', required: true, config: { terms_text: 'Bookings are subject to availability. Deposits are refundable up to 30 days before travel.' } } },

  heading: { label: 'Section Heading', icon: 'H', category: 'layout', displayOnly: true, defaults: { label: 'Section title' } },
  paragraph: { label: 'Paragraph', icon: '≡', category: 'layout', displayOnly: true, defaults: { label: 'Add some helpful information for travellers here.' } },
}

export const INPUT_TYPE_COUNT = Object.values(FIELD_TYPES).filter((t) => !t.displayOnly).length

export function newKey(prefix = 'field') {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`
}

export function createField(type) {
  const def = FIELD_TYPES[type]
  const d = structuredClone(def.defaults || {})
  return {
    key: newKey('field'),
    field_type: type,
    label: d.label || def.label,
    placeholder: d.placeholder || '',
    help_text: '',
    required: d.required || false,
    config: d.config || {},
  }
}

export function createPage(n) {
  return { key: newKey('page'), title: `Page ${n}`, description: '', show_progress_bar: true, required_all_fields: false, logic: null, fields: [] }
}
