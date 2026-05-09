const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAYS_SHORT = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const STORAGE_KEY = 'todoApp_allData';

// ── STORAGE ──
function loadAllData() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}; }
  catch { return {}; }
}
function saveAllData(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

// Date key format: "YYYY-MM-DD"
function dateKey(y, m, d) {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

// ── APP STATE ──
const now = new Date();
let viewYear   = now.getFullYear();
let viewMonth  = now.getMonth();
let selectedDay = now.getDate();

let pendingDeleteId = null;
let pickerYear = viewYear;

// ── CALENDAR STRIP ──
function renderCalendarStrip() {
  const strip = document.getElementById('calStrip');
  Array.from(strip.querySelectorAll('.day-btn')).forEach(b => b.remove());

  document.getElementById('calMonthYearLabel').textContent =
    `— ${MONTHS[viewMonth]} ${viewYear} —`;

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const allData = loadAllData();

  for (let d = 1; d <= daysInMonth; d++) {
    const btn = document.createElement('button');
    btn.className = 'day-btn';
    btn.textContent = d;

    const isToday = (
      d === now.getDate() &&
      viewMonth === now.getMonth() &&
      viewYear === now.getFullYear()
    );

    if (isToday) btn.classList.add('today');
    if (d === selectedDay) btn.classList.add('selected');

    const key = dateKey(viewYear, viewMonth, d);
    if (allData[key] && allData[key].length > 0) btn.classList.add('has-tasks');

    btn.addEventListener('click', () => {
      selectedDay = d;
      renderCalendarStrip();
      renderDateRow();
      renderTasks();
    });

    strip.appendChild(btn);
  }

  setTimeout(() => {
    const sel = strip.querySelector('.day-btn.selected');
    if (sel) sel.scrollIntoView({ inline: 'center', behavior: 'smooth', block: 'nearest' });
  }, 50);
}

// ── DATE ROW ──
function renderDateRow() {
  const fullDay = new Date(viewYear, viewMonth, selectedDay)
    .toLocaleDateString('en-US', { weekday: 'long' });
  document.getElementById('dateRow').textContent =
    `Date – ${String(selectedDay).padStart(2, '0')}/${String(viewMonth + 1).padStart(2, '0')}/${viewYear}    Day – ${fullDay}`;
}

// ── TASKS HELPERS ──
function getCurrentKey() { return dateKey(viewYear, viewMonth, selectedDay); }

function getTasks() {
  return loadAllData()[getCurrentKey()] || [];
}

function saveTasks(tasks) {
  const allData = loadAllData();
  allData[getCurrentKey()] = tasks;
  saveAllData(allData);
}

// ── RENDER TASKS ──
function renderTasks() {
  const tasks = getTasks();
  const list  = document.getElementById('taskList');
  const stats = document.getElementById('statsRow');
  list.innerHTML = '';

  const done  = tasks.filter(t => t.done).length;
  const total = tasks.length;

  stats.innerHTML = total > 0
    ? `<span>📝 ${total} task${total > 1 ? 's' : ''}</span><span>✅ ${done} done &nbsp; ⏳ ${total - done} left</span>`
    : '';

  if (tasks.length === 0) {
    list.innerHTML = '<div class="empty-msg">No tasks for this day. Add one above! 🎉</div>';
    renderCalendarStrip();
    return;
  }

  tasks.forEach(task => {
    const item = document.createElement('div');
    item.className = 'task-item' + (task.done ? ' done' : '');
    item.dataset.id = task.id;

    // Checkbox
    const check = document.createElement('button');
    check.className = 'check-btn';
    check.title = task.done ? 'Mark incomplete' : 'Mark complete';
    check.innerHTML = task.done ? '✓' : '';
    check.addEventListener('click', () => toggleDone(task.id));

    // Text
    const span = document.createElement('span');
    span.className = 'task-text';
    span.textContent = task.text;

    // Edit button
    const editBtn = document.createElement('button');
    editBtn.className = 'action-btn edit-btn';
    editBtn.title = 'Edit task';
    editBtn.innerHTML = '✏️';
    editBtn.addEventListener('click', () => startEdit(task.id, item, span));

    // Delete button
    const delBtn = document.createElement('button');
    delBtn.className = 'action-btn del-btn';
    delBtn.title = 'Delete task';
    delBtn.innerHTML = '✕';
    delBtn.addEventListener('click', () => openDeletePopup(task.id, task.text));

    item.appendChild(check);
    item.appendChild(span);
    item.appendChild(editBtn);
    item.appendChild(delBtn);
    list.appendChild(item);
  });

  renderCalendarStrip();
}

// ── ADD TASK ──
function addTask() {
  const input = document.getElementById('taskInput');
  const text  = input.value.trim();
  if (!text) { input.focus(); return; }

  const tasks = getTasks();
  tasks.push({
    id: Date.now().toString(),
    text,
    done: false,
    createdAt: new Date().toISOString()
  });
  saveTasks(tasks);
  input.value = '';
  input.focus();
  renderTasks();
}

// ── TOGGLE DONE ──
function toggleDone(id) {
  const tasks = getTasks().map(t => t.id === id ? { ...t, done: !t.done } : t);
  saveTasks(tasks);
  renderTasks();
}

// ── INLINE EDIT ──
function startEdit(id, item, span) {
  const currentText = span.textContent;

  const input = document.createElement('input');
  input.className = 'task-edit-input';
  input.value = currentText;

  const saveBtn = document.createElement('button');
  saveBtn.className = 'action-btn save-btn';
  saveBtn.title = 'Save';
  saveBtn.innerHTML = '✓';

  item.replaceChild(input, span);
  const editBtn = item.querySelector('.edit-btn');
  item.replaceChild(saveBtn, editBtn);

  input.focus();
  input.select();

  const doSave = () => {
    const newText = input.value.trim();
    if (!newText) return;
    const tasks = getTasks().map(t => t.id === id ? { ...t, text: newText } : t);
    saveTasks(tasks);
    renderTasks();
  };

  saveBtn.addEventListener('click', doSave);
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter') doSave();
    if (e.key === 'Escape') renderTasks();
  });
}

// ── DELETE POPUP ──
function openDeletePopup(id, text) {
  pendingDeleteId = id;
  document.getElementById('popupTaskText').textContent = text;
  document.getElementById('deleteOverlay').classList.add('show');
}

function closeDeletePopup() {
  pendingDeleteId = null;
  document.getElementById('deleteOverlay').classList.remove('show');
}

document.getElementById('popupNo').addEventListener('click', closeDeletePopup);
document.getElementById('deleteOverlay').addEventListener('click', e => {
  if (e.target === e.currentTarget) closeDeletePopup();
});
document.getElementById('popupYes').addEventListener('click', () => {
  if (!pendingDeleteId) return;
  saveTasks(getTasks().filter(t => t.id !== pendingDeleteId));
  closeDeletePopup();
  renderTasks();
});

// ── MONTH PICKER ──
function openMonthPicker() {
  pickerYear = viewYear;
  renderMonthPicker();
  document.getElementById('monthOverlay').classList.add('show');
}

function renderMonthPicker() {
  document.getElementById('yearDisplay').textContent = pickerYear;
  const grid = document.getElementById('monthGrid');
  grid.innerHTML = '';

  MONTHS.forEach((m, i) => {
    const btn = document.createElement('button');
    btn.className = 'month-option' +
      (i === viewMonth && pickerYear === viewYear ? ' active' : '');
    btn.textContent = m.slice(0, 3);
    btn.addEventListener('click', () => {
      viewMonth   = i;
      viewYear    = pickerYear;
      selectedDay = 1;
      document.getElementById('monthOverlay').classList.remove('show');
      renderCalendarStrip();
      renderDateRow();
      renderTasks();
    });
    grid.appendChild(btn);
  });
}

document.getElementById('monthPickerBtn').addEventListener('click', openMonthPicker);
document.getElementById('yearDown').addEventListener('click', () => { pickerYear--; renderMonthPicker(); });
document.getElementById('yearUp').addEventListener('click',   () => { pickerYear++; renderMonthPicker(); });
document.getElementById('monthClose').addEventListener('click', () =>
  document.getElementById('monthOverlay').classList.remove('show')
);
document.getElementById('monthOverlay').addEventListener('click', e => {
  if (e.target === e.currentTarget) e.currentTarget.classList.remove('show');
});

// ── ADD + ENTER ──
document.getElementById('addBtn').addEventListener('click', addTask);
document.getElementById('taskInput').addEventListener('keydown', e => {
  if (e.key === 'Enter') addTask();
});

// ── INIT ──
renderCalendarStrip();
renderDateRow();
renderTasks();
