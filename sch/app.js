// ========== MAIN APP CONTROLLER ==========

// Global data stores
let users = [];
let attendance = [];
let records = [];
let schedule = [];
let currentTab = 'home';
let hooksLoaded = 0;

/**
 * Switch between tabs
 */
function switchTab(tab) {
  currentTab = tab;
  
  document.querySelectorAll('.sidebar-nav a').forEach(a => a.classList.remove('active'));
  document.querySelector(`.sidebar-nav a[data-tab="${tab}"]`).classList.add('active');
  
  document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
  $(`tab-${tab}`).classList.add('active');
  
  const titles = { home: 'Home', users: 'Teachers', attendance: 'Attendance', records: 'Records', schedule: 'Schedule' };
  $('mainPageTitle').textContent = titles[tab] || 'Dashboard';
  
  closeSidebar();
  
  if (tab === 'users') applyUserFilters();
  if (tab === 'attendance') applyAttendanceFilters();
  if (tab === 'records') applyRecordsFilters();
  if (tab === 'schedule') applyScheduleFilters();
}

/**
 * Open filter modal for a specific tab
 */
function openFilterModal(tab) {
  const content = $('filterContent');
  if (!content) return;
  
  let html = '';
  
  if (tab === 'users') {
    html = `<div class="filter-group"><label>Department</label><select id="filterUserDept"><option value="all">All</option><option ${filterState.users.dept === 'Science' ? 'selected' : ''}>Science</option><option ${filterState.users.dept === 'Arts' ? 'selected' : ''}>Arts</option><option ${filterState.users.dept === 'Commercial' ? 'selected' : ''}>Commercial</option></select></div>
            <div class="filter-group"><label>Status</label><select id="filterUserStatus"><option value="all">All</option><option ${filterState.users.status === 'Active' ? 'selected' : ''}>Active</option><option ${filterState.users.status === 'Inactive' ? 'selected' : ''}>Inactive</option></select></div>`;
  } else if (tab === 'attendance') {
    html = `<div class="filter-group"><label>Status</label><select id="filterAttStatus"><option value="all">All</option><option ${filterState.attendance.status === 'ON TIME' ? 'selected' : ''}>ON TIME</option><option ${filterState.attendance.status === 'LATE' ? 'selected' : ''}>LATE</option><option ${filterState.attendance.status === 'EARLY' ? 'selected' : ''}>EARLY</option><option ${filterState.attendance.status === 'NO SCHEDULE' ? 'selected' : ''}>NO SCHEDULE</option></select></div>`;
  } else if (tab === 'records') {
    html = `<div class="filter-group"><label>Start Date</label><input type="date" id="filterRecStart" value="${filterState.records.startDate}"></div>
            <div class="filter-group"><label>End Date</label><input type="date" id="filterRecEnd" value="${filterState.records.endDate}"></div>
            <div class="filter-group"><label>Status</label><select id="filterRecStatus"><option value="all">All</option><option ${filterState.records.status === 'ON TIME' ? 'selected' : ''}>ON TIME</option><option ${filterState.records.status === 'LATE' ? 'selected' : ''}>LATE</option><option ${filterState.records.status === 'EARLY' ? 'selected' : ''}>EARLY</option><option ${filterState.records.status === 'NO SCHEDULE' ? 'selected' : ''}>NO SCHEDULE</option></select></div>`;
  } else if (tab === 'schedule') {
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    html = `<div class="filter-group"><label>Weekday</label><select id="filterScheduleDay"><option value="all">All</option>${days.map(d => `<option ${filterState.schedule.day === d ? 'selected' : ''}>${d}</option>`).join('')}</select></div>`;
  }
  
  html += `<div class="filter-actions"><button class="btn" onclick="closeFilterModal()">Cancel</button><button class="btn btn-primary" onclick="applyFiltersFromModal('${tab}')">Apply</button></div>`;
  content.innerHTML = html;
  $('filterModal').classList.add('show');
}

/**
 * Close filter modal
 */
function closeFilterModal() {
  $('filterModal').classList.remove('show');
}

/**
 * Apply filters from modal
 */
function applyFiltersFromModal(tab) {
  if (tab === 'users') {
    filterState.users.dept = $('filterUserDept').value;
    filterState.users.status = $('filterUserStatus').value;
    applyUserFilters();
  } else if (tab === 'attendance') {
    filterState.attendance.status = $('filterAttStatus').value;
    applyAttendanceFilters();
  } else if (tab === 'records') {
    filterState.records.startDate = $('filterRecStart').value;
    filterState.records.endDate = $('filterRecEnd').value;
    filterState.records.status = $('filterRecStatus').value;
    applyRecordsFilters();
  } else if (tab === 'schedule') {
    filterState.schedule.day = $('filterScheduleDay').value;
    applyScheduleFilters();
  }
  closeFilterModal();
}

/**
 * Check if all initial data hooks have loaded
 */
function checkInitComplete() {
  hooksLoaded++;
  if (hooksLoaded >= 4) {
    showLoading(false);
  }
}

/**
 * Start live synchronization with Firebase
 */
function startLiveSync() {
  if (!mainApp.classList.contains('visible')) return;
  
  showLoading(true);
  $('topbarDateDisplay').textContent = getTodayDate();
  $('todayDateDisplay').textContent = getTodayDate();
  
  hooksLoaded = 0;

  // Teachers listener
  db.ref('teachers').on('value', snap => {
    users = [];
    if (snap.val()) {
      Object.entries(snap.val()).forEach(([k, v]) => {
        if (k !== '_init') users.push({ key: k, ...v });
      });
    }
    $('userBadge').textContent = users.length;
    $('totalTeachersHome').textContent = users.length;
    if (currentTab === 'users') applyUserFilters();
    updateHomeStats();
    checkInitComplete();
  }, () => {
    users = [];
    checkInitComplete();
  });

  // Today's attendance listener
  db.ref('attendance').on('value', snap => {
    attendance = [];
    if (snap.val()) {
      const today = getTodayDate();
      Object.values(snap.val()).forEach(a => {
        if (a.timestamp && a.timestamp.split(' ')[0] === today) {
          attendance.push(a);
        }
      });
    }
    $('attendanceBadge').textContent = mergeAttendanceRecords(attendance).length;
    if (currentTab === 'attendance') applyAttendanceFilters();
    updateHomeStats();
    checkInitComplete();
  }, () => {
    attendance = [];
    checkInitComplete();
  });

  // All attendance records listener
  db.ref('attendance').on('value', snap => {
    records = [];
    if (snap.val()) {
      Object.values(snap.val()).forEach(r => {
        if (r.timestamp) records.push(r);
      });
    }
    $('recordsBadge').textContent = mergeAttendanceRecords(records).length;
    if (currentTab === 'records') applyRecordsFilters();
    updateHomeStats();
    checkInitComplete();
  }, () => {
    records = [];
    checkInitComplete();
  });

  // Schedule listener
  db.ref('schedule').on('value', snap => {
    schedule = [];
    if (snap.val()) {
      Object.values(snap.val()).forEach(s => {
        if (s.day) schedule.push(s);
      });
    }
    $('scheduleBadge').textContent = schedule.filter(s => s.clockIn !== 'NO SCHEDULE' && s.clockIn && s.clockIn !== '--').length;
    if (currentTab === 'schedule') applyScheduleFilters();
    updateHomeStats();
    checkInitComplete();
  }, () => {
    schedule = [];
    checkInitComplete();
  });

  watchPendingFingerprints();
}

/**
 * Refresh all data
 */
function refreshData() {
  toast(' Syncing...');
  hooksLoaded = 0;
  db.ref('teachers').off();
  db.ref('attendance').off();
  db.ref('schedule').off();
  db.ref('pending_fingerprints').off();
  db.ref('pending_cards').off();
  setTimeout(startLiveSync, 500);
}