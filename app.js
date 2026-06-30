const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const STORAGE_KEY = 'todoApp_allData';

// ── STORAGE ──
function loadAllData() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}; }
  catch { return {}; }
}
function saveAllData(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function dateKey(y, m, d) {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

// ── APP STATE ──
const now = new Date();
let viewYear    = now.getFullYear();
let viewMonth   = now.getMonth();
let selectedDay = now.getDate();
let pendingDeleteId    = null;
let pendingDeleteIsDue = false;
let pickerYear  = viewYear;
let dueVisible  = false;
let dragSourceId = null;

// ── DATE HELPERS ──
function getCurrentKey() { return dateKey(viewYear, viewMonth, selectedDay); }
function getTodayKey()   { return dateKey(now.getFullYear(), now.getMonth(), now.getDate()); }
function isPastDate()    { return getCurrentKey() < getTodayKey(); }
function isTodayView()   { return getCurrentKey() === getTodayKey(); }

// ── TASK GETTERS / SETTERS ──
function getTasks() {
  return loadAllData()[getCurrentKey()] || [];
}
function saveTasks(tasks) {
  const d = loadAllData();
  d[getCurrentKey()] = tasks;
  saveAllData(d);
}
function getTodayTasks() {
  return loadAllData()[getTodayKey()] || [];
}
function saveTodayTasks(tasks) {
  const d = loadAllData();
  d[getTodayKey()] = tasks;
  saveAllData(d);
}

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

    const isToday = d === now.getDate() && viewMonth === now.getMonth() && viewYear === now.getFullYear();
    if (isToday)      btn.classList.add('today');
    if (d === selectedDay) btn.classList.add('selected');

    const key = dateKey(viewYear, viewMonth, d);
    // Only count regular (non-due) tasks for the dot indicator
    if ((allData[key] || []).filter(t => !t.isDue).length > 0)
      btn.classList.add('has-tasks');

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
    `Date – ${String(selectedDay).padStart(2,'0')}/${String(viewMonth+1).padStart(2,'0')}/${viewYear}    Day – ${fullDay}`;
}

// ── RENDER TASKS ──
function renderTasks() {
  const tasks        = getTasks();
  const regularTasks = tasks.filter(t => !t.isDue);
  // Due items always live in today's task list
  const dueTasks     = getTodayTasks().filter(t => t.isDue);

  const list  = document.getElementById('taskList');
  const stats = document.getElementById('statsRow');
  list.innerHTML = '';

  const done  = regularTasks.filter(t => t.done).length;
  const total = regularTasks.length;

  stats.innerHTML = total > 0
    ? `<span>📝 ${total} task${total > 1 ? 's' : ''}</span><span>✅ ${done} done &nbsp; ⏳ ${total - done} left</span>`
    : '';

  // ── Past date hint banner ──
  if (isPastDate()) {
    const banner = document.createElement('div');
    banner.className = 'past-date-banner';
    banner.innerHTML = '📅 Past date &nbsp;·&nbsp; <b>↺</b> repeat task to today &nbsp;·&nbsp; <b>📌</b> send to due list';
    list.appendChild(banner);
  }

  // ── Empty state ──
  if (regularTasks.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'empty-msg';
    empty.textContent = isPastDate()
      ? 'No tasks were recorded for this day.'
      : 'No tasks for this day. Add one above! 🎉';
    list.appendChild(empty);
  }

  // ── Regular tasks — first 3 wrapped in red priority box ──
  if (regularTasks.length > 0) {
    const topCount = Math.min(3, regularTasks.length);

    const box = document.createElement('div');
    box.className = 'priority-box';

    const lbl = document.createElement('span');
    lbl.className = 'priority-label';
    lbl.textContent = '★ Top Priority';
    box.appendChild(lbl);

    for (let i = 0; i < topCount; i++) {
      box.appendChild(buildTaskEl(regularTasks[i], false));
    }
    list.appendChild(box);

    // Remaining tasks sit below the box
    for (let i = topCount; i < regularTasks.length; i++) {
      list.appendChild(buildTaskEl(regularTasks[i], false));
    }
  }

  // ── Previous Due section (today's view only) ──
  if (isTodayView()) {
    const dueBtn = document.createElement('button');
    dueBtn.className = 'due-toggle-btn';
    dueBtn.innerHTML = dueVisible
      ? `▲ Previous Due${dueTasks.length ? ` (${dueTasks.length})` : ''}`
      : `📋 Previous Due${dueTasks.length ? ` (${dueTasks.length})` : ''}`;
    dueBtn.addEventListener('click', () => {
      dueVisible = !dueVisible;
      renderTasks();
    });
    list.appendChild(dueBtn);

    if (dueVisible) {
      const sec = document.createElement('div');
      sec.className = 'due-section';

      if (!dueTasks.length) {
        const em = document.createElement('div');
        em.className = 'empty-msg';
        em.style.fontSize = '13px';
        em.textContent = 'No due items yet. Go to a past date and tap 📌 to carry tasks here.';
        sec.appendChild(em);
      } else {
        const lbl = document.createElement('div');
        lbl.className = 'due-section-label';
        lbl.textContent = '⚠️ Carried Over';
        sec.appendChild(lbl);
        dueTasks.forEach(task => sec.appendChild(buildTaskEl(task, true)));
      }

      list.appendChild(sec);
    }
  }

  renderCalendarStrip();
}

// ── BUILD TASK ELEMENT ──
function buildTaskEl(task, isDueItem) {
  const item = document.createElement('div');
  item.className = 'task-item' + (task.done ? ' done' : '') + (isDueItem ? ' due-item' : '');
  item.dataset.id = task.id;

  // ── Drag handle (regular tasks only) ──
  if (!isDueItem) {
    const handle = document.createElement('span');
    handle.className = 'drag-handle';
    handle.textContent = '⠿';
    handle.title = 'Drag to reorder priority';
    handle.setAttribute('draggable', 'true');

    handle.addEventListener('dragstart', e => {
      dragSourceId = task.id;
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', task.id);
      // Use the whole row as the drag ghost image
      try { e.dataTransfer.setDragImage(item, 24, 14); } catch(err) {}
      setTimeout(() => item.classList.add('dragging'), 0);
    });

    handle.addEventListener('dragend', () => {
      document.querySelectorAll('.task-item').forEach(el =>
        el.classList.remove('dragging', 'drag-over'));
      dragSourceId = null;
    });

    item.appendChild(handle);

    // Drop target events on the whole row
    item.addEventListener('dragover', e => {
      if (!dragSourceId || dragSourceId === task.id) return;
      e.preventDefault();
      document.querySelectorAll('.task-item').forEach(el => el.classList.remove('drag-over'));
      item.classList.add('drag-over');
    });

    item.addEventListener('dragleave', e => {
      // Only remove if truly leaving the item (not entering a child)
      if (!e.relatedTarget || !item.contains(e.relatedTarget))
        item.classList.remove('drag-over');
    });

    item.addEventListener('drop', e => {
      e.preventDefault();
      item.classList.remove('drag-over');
      if (!dragSourceId || dragSourceId === task.id) return;
      doReorder(dragSourceId, task.id);
    });
  }

  // ── Checkbox ──
  const check = document.createElement('button');
  check.className = 'check-btn';
  check.innerHTML = task.done ? '✓' : '';
  check.title = task.done ? 'Mark incomplete' : 'Mark complete';
  check.addEventListener('click', () => toggleDone(task.id, isDueItem));
  item.appendChild(check);

  // ── Task text ──
  const span = document.createElement('span');
  span.className = 'task-text';
  span.textContent = task.text;
  item.appendChild(span);

  // ── ↺ Repeat button: all tasks on past dates ──
  if (isPastDate() && !isDueItem) {
    const rb = document.createElement('button');
    rb.className = 'action-btn repeat-btn';
    rb.title = 'Repeat this task on today\'s list (added at top)';
    rb.textContent = '↺';
    rb.addEventListener('click', () => repeatToToday(task.text));
    item.appendChild(rb);
  }

  // ── 📌 Due button: only incomplete tasks on past dates ──
  if (isPastDate() && !task.done && !isDueItem) {
    const db = document.createElement('button');
    db.className = 'action-btn due-add-btn';
    db.title = 'Send to today\'s Previous Due list';
    db.textContent = '📌';
    db.addEventListener('click', () => addToDue(task.text));
    item.appendChild(db);
  }

  // ── Edit button ──
  const editBtn = document.createElement('button');
  editBtn.className = 'action-btn edit-btn';
  editBtn.title = 'Edit task';
  editBtn.innerHTML = '✏️';
  editBtn.addEventListener('click', () => startEdit(task.id, item, span, isDueItem));
  item.appendChild(editBtn);

  // ── Delete button ──
  const delBtn = document.createElement('button');
  delBtn.className = 'action-btn del-btn';
  delBtn.title = 'Delete task';
  delBtn.innerHTML = '✕';
  delBtn.addEventListener('click', () => openDeletePopup(task.id, task.text, isDueItem));
  item.appendChild(delBtn);

  return item;
}

// ── DRAG REORDER ──
// Moves srcId to the position just before tgtId in the regular task array.
function doReorder(srcId, tgtId) {
  const tasks   = getTasks();
  const regular = tasks.filter(t => !t.isDue);
  const due     = tasks.filter(t => t.isDue);

  const srcIdx = regular.findIndex(t => t.id === srcId);
  if (srcIdx === -1) return;

  const [moved] = regular.splice(srcIdx, 1);
  const newTgtIdx = regular.findIndex(t => t.id === tgtId);
  if (newTgtIdx === -1) regular.push(moved);
  else regular.splice(newTgtIdx, 0, moved);

  saveTasks([...regular, ...due]);
  renderTasks();
}

// ── ADD TASK ──
function addTask() {
  const input = document.getElementById('taskInput');
  const text  = input.value.trim();
  if (!text) { input.focus(); return; }

  const tasks   = getTasks();
  const regular = tasks.filter(t => !t.isDue);
  const due     = tasks.filter(t => t.isDue);

  regular.push({
    id: Date.now().toString(),
    text,
    done: false,
    createdAt: new Date().toISOString()
  });

  saveTasks([...regular, ...due]);
  input.value = '';
  input.focus();
  renderTasks();
}

// ── TOGGLE DONE ──
function toggleDone(id, isDueItem) {
  if (isDueItem) {
    saveTodayTasks(getTodayTasks().map(t => t.id === id ? { ...t, done: !t.done } : t));
  } else {
    saveTasks(getTasks().map(t => t.id === id ? { ...t, done: !t.done } : t));
  }
  renderTasks();
}

// ── REPEAT TO TODAY ──
// Copies the task text as a new task at the TOP of today's regular list.
function repeatToToday(text) {
  const tt      = getTodayTasks();
  const regular = tt.filter(t => !t.isDue);
  const due     = tt.filter(t => t.isDue);

  const newTask = {
    id: Date.now().toString(),
    text,
    done: false,
    createdAt: new Date().toISOString()
  };

  // Insert at top → user can then drag to reprioritize
  saveTodayTasks([newTask, ...regular, ...due]);
  showToast('↺ Added to today at top!');
}

// ── ADD TO DUE ──
// Sends an incomplete past-date task to today's Previous Due section.
function addToDue(text) {
  const newDue = {
    id: Date.now().toString(),
    text,
    done: false,
    isDue: true,
    dueFrom: getCurrentKey(),
    createdAt: new Date().toISOString()
  };
  saveTodayTasks([...getTodayTasks(), newDue]);
  showToast('📌 Added to due list!');
}

// ── TOAST ──
function showToast(msg) {
  document.querySelectorAll('.toast').forEach(el => el.remove());
  const t = document.createElement('div');
  t.className = 'toast';
  t.textContent = msg;
  document.body.appendChild(t);
  // Double rAF ensures transition plays after insertion
  requestAnimationFrame(() => requestAnimationFrame(() => t.classList.add('show')));
  setTimeout(() => {
    t.classList.remove('show');
    setTimeout(() => t.remove(), 300);
  }, 2500);
}

// ── INLINE EDIT ──
function startEdit(id, item, span, isDueItem) {
  const input = document.createElement('input');
  input.className = 'task-edit-input';
  input.value = span.textContent;

  const saveBtn = document.createElement('button');
  saveBtn.className = 'action-btn save-btn';
  saveBtn.innerHTML = '✓';
  saveBtn.title = 'Save';

  item.replaceChild(input, span);
  item.replaceChild(saveBtn, item.querySelector('.edit-btn'));
  input.focus();
  input.select();

  const doSave = () => {
    const txt = input.value.trim();
    if (!txt) return;
    if (isDueItem) {
      saveTodayTasks(getTodayTasks().map(t => t.id === id ? { ...t, text: txt } : t));
    } else {
      saveTasks(getTasks().map(t => t.id === id ? { ...t, text: txt } : t));
    }
    renderTasks();
  };

  saveBtn.addEventListener('click', doSave);
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter')  doSave();
    if (e.key === 'Escape') renderTasks();
  });
}

// ── DELETE POPUP ──
function openDeletePopup(id, text, isDueItem) {
  pendingDeleteId    = id;
  pendingDeleteIsDue = isDueItem;
  document.getElementById('popupTaskText').textContent = text;
  document.getElementById('deleteOverlay').classList.add('show');
}
function closeDeletePopup() {
  pendingDeleteId    = null;
  pendingDeleteIsDue = false;
  document.getElementById('deleteOverlay').classList.remove('show');
}
document.getElementById('popupNo').addEventListener('click', closeDeletePopup);
document.getElementById('deleteOverlay').addEventListener('click', e => {
  if (e.target === e.currentTarget) closeDeletePopup();
});
document.getElementById('popupYes').addEventListener('click', () => {
  if (!pendingDeleteId) return;
  if (pendingDeleteIsDue) {
    saveTodayTasks(getTodayTasks().filter(t => t.id !== pendingDeleteId));
  } else {
    saveTasks(getTasks().filter(t => t.id !== pendingDeleteId));
  }
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
  document.getElementById('monthOverlay').classList.remove('show'));
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
