/* ---------- SHOPPING LIST ---------- */
async function loadShoppingList() {
  const container = document.getElementById('shopping-list');
  try {
    const response = await fetch('/api/shopping');
    const tasks = await response.json();
    if (tasks.length === 0) {
      container.innerHTML = '<span style="color: var(--muted)">Nothing needed right now.</span>';
      return;
    }
    container.innerHTML = tasks
      .map(t => {
        const tagEmoji = {
          fish: '🐟', meat: '🥩', vegetables: '🥦', salad: '🥗',
          dairy: '🥛', cheese: '🧀', herbs: '🌿', fruit: '🍎',
          oil: '🫙', staples: '🌾', pantry: '🥫', spices: '🌶️'
        };
        const tags = t.tags || [];
        const emoji = tags.map(tag => tagEmoji[tag]).find(e => e) || '🛒';
        return `<div>${emoji} ${t.description}</div>`;
      })
      .join('');
  } catch (e) {
    container.innerHTML = '<span style="color: #ff4444">Could not load shopping list.</span>';
    console.error('Shopping list error:', e);
  }
}

window.addEventListener('DOMContentLoaded', loadShoppingList);
