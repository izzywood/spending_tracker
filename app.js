(() => {
  const STORAGE_KEY ='shopping-tracker:purchases';

  /** @typedef {{ id:string, item:string, category:string, price:number, date:string }} Purchase */

  /** @type {Purchase[]} */
  let purchases = loadPurchases();
  let editingId = null;
  let lastCategory = '';

  // Elements
  const form = document.getElementById('purchase-form');
  const itemEl = document.getElementById('item');
  const catEl = document.getElementById('category');
  const priceEl = document.getElementById('price');
  const wasTodayEl = document.getElementById('was-today');
  const dateEl = document.getElementById('date');
  const tbody = document.getElementById('purchase-tbody');
  const totalsEl = document.getElementById('totals');

  const filterTextEl = document.getElementById('filter-text');
  const filterCatEl = document.getElementById('filter-category');
  const filterFromEl = document.getElementById('filter-from');
  const filterToEl = document.getElementById('filter-to');

  const resetBtn = document.getElementById('reset-form');
  const clearFiltersBtn = document.getElementById('clear-filters');
  const exportBtn = document.getElementById('export-json');
  const importInput = document.getElementById('import-json');
  const clearAllBtn = document.getElementById('clear-all');

  form.addEventListener('submit', onSubmit);
  resetBtn.addEventListener('click', () => form.reset());
  if (clearFiltersBtn) {
    clearFiltersBtn.addEventListener('click', () => {
      filterTextEl.value = '';
      filterCatEl.value = '';
      filterFromEl.value = '';
      filterToEl.value = '';
      render();
    });
  }
  [filterTextEl, filterCatEl, filterFromEl, filterToEl].forEach(el => el.addEventListener('input', render));

  exportBtn.addEventListener('click', () => {
    const blob = new Blob([JSON.stringify(purchases, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'purchases.json';
    a.click();
    URL.revokeObjectURL(url);
  });

  importInput.addEventListener('change', async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      if (!Array.isArray(data)) throw new Error('Invalid JSON format');
      purchases = data.map(sanitizePurchase).filter(Boolean);
      savePurchases();
      render();
    } catch (err) {
      alert('Import failed: ' + err.message);
    } finally {
      importInput.value = '';
    }
  });

  clearAllBtn.addEventListener('click', () => {
    if (!confirm('Clear all purchases?')) return;
    purchases = [];
    savePurchases();
    render();
  });

  function onSubmit(event) {
    event.preventDefault();
    const item = itemEl.value.trim();
    const category = catEl.value.trim();
    const price = Number(priceEl.value);
    const isToday = wasTodayEl ? wasTodayEl.checked : false;
    const date = isToday ? new Date().toISOString().slice(0,10) : (dateEl.value || new Date().toISOString().slice(0,10));
    if (!item || !(price >= 0)) return;

    if (editingId) {
      const idx = purchases.findIndex(p => p.id === editingId);
      if (idx !== -1) {
        purchases[idx] = { ...purchases[idx], item, category, price, date };
      }
      editingId = null;
    } else {
      const newPurchase = {
        id: crypto.randomUUID(),
        item, category, price, date
      };
      purchases.unshift(newPurchase);
    }

    savePurchases();
    
    // Store the category for next time
    lastCategory = category;
    
    form.reset();
    dateEl.valueAsNumber = Date.now() - (new Date()).getTimezoneOffset() * 60000;
    
    // Restore the last category
    catEl.value = lastCategory;
    
    render();
  }

  function sanitizePurchase(obj) {
    try {
      const id = typeof obj.id === 'string' ? obj.id : crypto.randomUUID();
      const item = String(obj.item || '').trim();
      const category = String(obj.category || '').trim();
      const price = Number(obj.price);
      const quantity = 1;
      const date = (obj.date ? String(obj.date) : new Date().toISOString().slice(0,10)).slice(0,10);
      if (!item || isNaN(price)) return null;
      return { id, item, category, price, date };
    } catch (e) { return null; }
  }

  function loadPurchases() {
    try {
      const text = localStorage.getItem(STORAGE_KEY);
      if (!text) return [];
      const arr = JSON.parse(text);
      if (!Array.isArray(arr)) return [];
      return arr.map(sanitizePurchase).filter(Boolean);
    } catch {
      return [];
    }
  }

  function savePurchases() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(purchases));
  }

  function formatMoney(n) {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency: guessCurrency() }).format(n);
  }

  function guessCurrency() {
    return 'GBP';
  }

  function applyFilters(list) {
    const text = filterTextEl.value.trim().toLowerCase();
    const cat = filterCatEl.value.trim().toLowerCase();
    const from = filterFromEl.value ? new Date(filterFromEl.value) : null;
    const to = filterToEl.value ? new Date(filterToEl.value) : null;
    return list.filter(p => {
      if (text && !(p.item.toLowerCase().includes(text) || p.category.toLowerCase().includes(text))) return false;
      if (cat && p.category.toLowerCase() !== cat) return false;
      const d = new Date(p.date);
      if (from && d < from) return false;
      if (to) {
        const toEnd = new Date(to);
        toEnd.setHours(23,59,59,999);
        if (d > toEnd) return false;
      }
      return true;
    });
  }

  function render() {
    const filtered = applyFilters(purchases);
    tbody.innerHTML = '';
    if (filtered.length === 0) {
      const tr = document.createElement('tr');
      const td = document.createElement('td');
      td.colSpan = 5;
      td.textContent = 'No purchases yet';
      td.style.color = '#a8b3c1';
      tr.appendChild(td);
      tbody.appendChild(tr);
    } else {
      for (const p of filtered) {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${p.date}</td>
          <td>${escapeHtml(p.item)}</td>
          <td>${escapeHtml(p.category)}</td>
          <td class="num">${formatMoney(p.price)}</td>
          <td class="num">
            <div class="row-actions">
              <button data-act="edit" data-id="${p.id}">Edit</button>
              <button class="danger" data-act="delete" data-id="${p.id}">Delete</button>
            </div>
          </td>
        `;
        tbody.appendChild(tr);
      }
    }

    tbody.querySelectorAll('button[data-act]').forEach(btn =>
      btn.addEventListener('click', onRowAction)
    );

    const totalAmt = filtered.reduce((sum, p) => sum + p.price, 0);
    totalsEl.innerHTML = `Items: <strong>${filtered.length}</strong> · Sum: <strong>${formatMoney(totalAmt)}</strong>`;
  }

  function onRowAction(e) {
    const btn = e.currentTarget;
    const id = btn.getAttribute('data-id');
    const act = btn.getAttribute('data-act');
    if (act === 'delete') {
      if (!confirm('Delete this purchase?')) return;
      purchases = purchases.filter(p => p.id !== id);
      savePurchases();
      render();
      return;
    }
    if (act === 'edit') {
      const p = purchases.find(x => x.id === id);
      if (!p) return;
      itemEl.value = p.item;
      catEl.value = p.category;
      priceEl.value = String(p.price);
      dateEl.value = p.date;
      editingId = p.id;
      itemEl.focus();
    }
  }

  function escapeHtml(s) {
    return s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  }

  // Initial render
  render();
  // Chart hook will be initialized in renderChart if canvas exists
  try { if (document.getElementById('spend-chart')) renderChart(); } catch {}

  // Scroll-based title animation
  let scrollTimeout;
  window.addEventListener('scroll', () => {
    const scrolled = window.scrollY > 100;
    document.body.classList.toggle('scrolled', scrolled);
  });

  function groupByWeek(purchasesList) {
    const map = new Map();
    for (const p of purchasesList) {
      const weekKey = getWeekStart(p.date);
      if (!map.has(weekKey)) map.set(weekKey, []);
      map.get(weekKey).push(p);
    }
    return map;
  }

  function getWeekStart(dateStr) {
    const d = new Date(dateStr);
    const day = d.getDay();
    const diff = (day === 0 ? -6 : 1) - day; // Monday as start
    d.setDate(d.getDate() + diff);
    return d.toISOString().slice(0,10);
  }

  function renderChart() {
    if (typeof Chart === 'undefined') return;
    const ctx = document.getElementById('spend-chart');
    if (!ctx) return;
    const filtered = applyFilters(purchases);
    const weeks = Array.from(groupByWeek(filtered).entries()).sort((a,b) => a[0].localeCompare(b[0]));
    const categories = Array.from(new Set(filtered.map(p => p.category))).filter(Boolean);
    const labels = weeks.map(([wk]) => `W/C ${wk}`);
    const palette = [
      '#7b2d3a', '#e7e2db', '#b63a3a', '#d9a5b3', '#8c5f66', '#a37a74'
    ];
    const datasets = categories.map((cat, i) => ({
      label: cat,
      backgroundColor: palette[i % palette.length],
      data: weeks.map(([wk, list]) => list.filter(p => p.category === cat).reduce((s, p) => s + p.price, 0)),
      stack: 'total'
    }));
    const data = { labels, datasets };
    const existing = ctx._chartInstance;
    if (existing) { existing.destroy(); }
    const chart = new Chart(ctx, {
      type: 'bar',
      data,
      options: {
        responsive: true,
        plugins: {
          legend: { position: 'bottom' },
          tooltip: { mode: 'index', intersect: false }
        },
        scales: {
          x: { stacked: true },
          y: { 
            stacked: true, 
            title: { display: true, text: 'Spending (£)' },
            ticks: {
              callback: function(value) {
                return '£' + value.toFixed(0);
              }
            }
          }
        }
      }
    });
    ctx._chartInstance = chart;
  }
})();
