// ESTADO

/** @type {Array<{id:string, title:string, col:string, tag:string, priority:string, due:string}>} */
let cards = JSON.parse(localStorage.getItem('kb-cards') || '[]');

let editingId  = null;  // ID do card sendo editado (null = novo)
let draggedId  = null;  // ID do card em arraste

const COLS = ['todo', 'doing', 'done'];

// PERSISTÊNCIA

function saveAndRender() {
  localStorage.setItem('kb-cards', JSON.stringify(cards));
  render();
}

// UTILITÁRIOS

/** Escapa caracteres HTML para evitar XSS */
function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Formata "YYYY-MM-DD" para "DD/MM" */
function formatDate(isoDate) {
  if (!isoDate) return '';
  const [, month, day] = isoDate.split('-');
  return `${day}/${month}`;
}

/** Gera ID único baseado em timestamp + random */
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

// RENDERIZAÇÃO

function render() {
  let total = 0;

  COLS.forEach(col => {
    const body     = document.getElementById('body-' + col);
    const count    = document.getElementById('count-' + col);
    const colCards = cards.filter(c => c.col === col);

    count.textContent = colCards.length;
    total += colCards.length;

    const ghost = body.querySelector('.drop-ghost');
    body.innerHTML = '';
    body.appendChild(ghost);

    colCards.forEach(card => body.appendChild(buildCard(card)));
  });

  document.getElementById('task-counter').textContent =
    total + (total === 1 ? ' Tarefa' : ' Tarefas');
}

/**
 * @param {{id:string, title:string, tag:string, priority:string, due:string}} card
 * @returns {HTMLElement}
 */

function buildCard(card) {
  const el = document.createElement('div');
  el.className  = `card p-${card.priority}`;
  el.draggable  = true;
  el.dataset.id = card.id;

  el.innerHTML = `
    <span class="card-tag tag-${card.tag}">${escapeHtml(card.tag)}</span>
    <p class="card-title">${escapeHtml(card.title)}</p>
    <div class="card-footer">
      <span class="card-due">${card.due ? '📋 ' + formatDate(card.due) : ''}</span>
      <div class="card-actions">
        <button class="card-btn edit"   data-id="${card.id}" title="Editar">✎</button>
        <button class="card-btn delete" data-id="${card.id}" title="Excluir">✕</button>
      </div>
    </div>
  `;

  el.addEventListener('dragstart', onDragStart);
  el.addEventListener('dragend',   onDragEnd);

  el.querySelector('.edit').addEventListener('click',   () => openEditModal(card.id));
  el.querySelector('.delete').addEventListener('click', () => deleteCard(card.id));

  return el;
}

// DRAG & DROP

function onDragStart(e) {
  draggedId = e.currentTarget.dataset.id;
  e.currentTarget.classList.add('dragging');
  e.dataTransfer.effectAllowed = 'move';
}

function onDragEnd(e) {
  e.currentTarget.classList.remove('dragging');
  document.querySelectorAll('.column').forEach(col => col.classList.remove('drag-over'));
}

function setupDropZones() {
  document.querySelectorAll('.column').forEach(col => {
    col.addEventListener('dragover', e => {
      e.preventDefault();
      col.classList.add('drag-over');
      e.dataTransfer.dropEffect = 'move';
    });

    col.addEventListener('dragleave', e => {
      if (!col.contains(e.relatedTarget)) {
        col.classList.remove('drag-over');
      }
    });

    col.addEventListener('drop', e => {
      e.preventDefault();
      col.classList.remove('drag-over');

      const targetCol = col.dataset.col;
      const card = cards.find(c => c.id === draggedId);

      if (card && card.col !== targetCol) {
        card.col = targetCol;
        saveAndRender();
      }
    });
  });
}

// MODAL

const overlay = document.getElementById('modal-overlay');

function openModal(col = 'todo') {
  editingId = null;
  document.getElementById('modal-title').textContent = 'Nova tarefa';
  document.getElementById('f-title').value    = '';
  document.getElementById('f-col').value      = col;
  document.getElementById('f-tag').value      = 'dev';
  document.getElementById('f-priority').value = 'medium';
  document.getElementById('f-due').value      = '';

  overlay.classList.add('open');
  setTimeout(() => document.getElementById('f-title').focus(), 60);
}

function openEditModal(id) {
  const card = cards.find(c => c.id === id);
  if (!card) return;

  editingId = id;
  document.getElementById('modal-title').textContent = 'Editar tarefa';
  document.getElementById('f-title').value    = card.title;
  document.getElementById('f-col').value      = card.col;
  document.getElementById('f-tag').value      = card.tag;
  document.getElementById('f-priority').value = card.priority;
  document.getElementById('f-due').value      = card.due || '';

  overlay.classList.add('open');
}

function closeModal() {
  overlay.classList.remove('open');
  editingId = null;
}

function saveCard() {
  const title = document.getElementById('f-title').value.trim();
  if (!title) {
    document.getElementById('f-title').focus();
    return;
  }

  const data = {
    title,
    col:      document.getElementById('f-col').value,
    tag:      document.getElementById('f-tag').value,
    priority: document.getElementById('f-priority').value,
    due:      document.getElementById('f-due').value,
  };

  if (editingId) {
    const idx = cards.findIndex(c => c.id === editingId);
    if (idx !== -1) cards[idx] = { ...cards[idx], ...data };
  } else {
    cards.push({ id: generateId(), ...data });
  }

  closeModal();
  saveAndRender();
}

function deleteCard(id) {
  cards = cards.filter(c => c.id !== id);
  saveAndRender();
}

// EVENTOS GLOBAIS

document.getElementById('btn-new-task').addEventListener('click', () => openModal());
document.getElementById('btn-save').addEventListener('click', saveCard);
document.getElementById('btn-cancel').addEventListener('click', closeModal);
document.getElementById('modal-close').addEventListener('click', closeModal);

overlay.addEventListener('click', e => {
  if (e.target === overlay) closeModal();
});

document.querySelectorAll('.btn-add-col').forEach(btn => {
  btn.addEventListener('click', () => openModal(btn.dataset.col));
});

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeModal();
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') saveCard();
});

// DADOS INICIAIS (seed)

if (cards.length === 0) {
  cards = [
    { id: generateId(), title: 'Fazer o html do site',             col: 'todo',  tag: 'dev',      priority: 'high',   due: '2026-05-12' },
    { id: generateId(), title: 'Correção de bug na imagem do site', col: 'todo',  tag: 'bug',      priority: 'high',   due: '2026-05-12' },
    { id: generateId(), title: 'Organização da barra de tarefas',   col: 'doing', tag: 'dev',      priority: 'medium', due: '2026-05-12' },
    { id: generateId(), title: 'Revisar pull request #42',          col: 'doing', tag: 'revisão',  priority: 'low',    due: '2026-05-12' },
    { id: generateId(), title: 'Escrever documentação da API',      col: 'done',  tag: 'conteúdo', priority: 'medium', due: '2026-05-12' },
  ];
  saveAndRender();
}

// INICIALIZAÇÃO

setupDropZones();
render();