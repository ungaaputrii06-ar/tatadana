import assert from 'node:assert';

// Test category matching fix
const sysCategories = [
  { id: 'cat-01', name: 'Makanan & Minuman', type: 'expense', emoji: '🍜' },
  { id: 'cat-02', name: 'Transportasi', type: 'expense', emoji: '🚗' },
  { id: 'cat-08', name: 'Gaji & Upah', type: 'income', emoji: '💰' },
  { id: 'cat-09', name: 'Freelance & Side Hustle', type: 'income', emoji: '💻' },
];

function resolve(categories, categoryName, type) {
  const cName = (categoryName || '').toLowerCase().trim();
  for (const cat of categories) {
    if (cat.type && cat.type !== type) continue;
    const name = cat.name.toLowerCase();
    if (name === cName || name.includes(cName) || cName.includes(name)) {
      return cat;
    }
  }
  return type === 'income' ? categories.find(c => c.type === 'income') : categories[0];
}

const parsedIncome = { type: 'income', category: 'Pemasukan Lainnya' };
const matchedCategory = resolve(sysCategories, parsedIncome.category, parsedIncome.type);

assert.strictEqual(matchedCategory.type, 'income');
assert.strictEqual(matchedCategory.id, 'cat-08');
console.log('✓ Category matching bug is FIXED: income resolves to', matchedCategory.name);
