const CATEGORY_COLORS = {
  'Fiction':      { from: '#6C47FF', to: '#A78BFA' },
  'History':      { from: '#0ea5e9', to: '#38bdf8' },
  'Technology':   { from: '#06b6d4', to: '#67e8f9' },
  'Science':      { from: '#10b981', to: '#6ee7b7' },
  'Philosophy':   { from: '#f59e0b', to: '#fcd34d' },
  'Psychology':   { from: '#ec4899', to: '#f9a8d4' },
  'Business':     { from: '#f97316', to: '#fdba74' },
  'Biography':    { from: '#8b5cf6', to: '#c4b5fd' },
  'Art & Design': { from: '#14b8a6', to: '#5eead4' },
  'Religion':     { from: '#ef4444', to: '#fca5a5' },
  'default':      { from: '#64748b', to: '#94a3b8' },
};

export function getCategoryGradient(category) {
  const c = CATEGORY_COLORS[category] || CATEGORY_COLORS['default'];
  return `linear-gradient(135deg, ${c.from}, ${c.to})`;
}

export function getCategoryColors(category) {
  return CATEGORY_COLORS[category] || CATEGORY_COLORS['default'];
}

export default CATEGORY_COLORS;
