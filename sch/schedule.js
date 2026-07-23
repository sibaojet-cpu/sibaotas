// ========== SCHEDULE MODULE ==========

let schedulePage = 1;

/**
 * Apply schedule filters
 */
function applyScheduleFilters() {
  let data = [...schedule];
  const q = $('scheduleSearch').value.toLowerCase();
  if (q) data = data.filter(s => (s.day || '').toLowerCase().includes(q));
  if (filterState.schedule.day !== 'all') data = data.filter(s => s.day === filterState.schedule.day);
  $('scheduleCountDisplay').textContent = data.length + ' entries';
  renderScheduleStats(data);
  renderScheduleGrid(data);
  renderScheduleTable(data);
}

/**
 * Render schedule statistics
 */
function renderScheduleStats(data) {
  const todayDay = getTodayDayName();
  let todayEntry = data.find(d => d.day === todayDay);
  if (!todayEntry && data.length) todayEntry = data[0];
  
  const shiftStart = todayEntry ? (todayEntry.clockIn === 'NO SCHEDULE' ? '--' : todayEntry.clockIn) : '--';
  const shiftEnd = todayEntry ? (todayEntry.clockOut === 'NO SCHEDULE' ? '--' : todayEntry.clockOut) : '--';
  const grace = todayEntry ? (todayEntry.clockIn === 'NO SCHEDULE' ? '--' : todayEntry.latenessThreshold) : '--';
  
  $('scheduleStats').innerHTML = `
    <div class="stat-card"><div class="stat-label">Today</div><div class="stat-value success">${shiftStart}</div></div>
    <div class="stat-card"><div class="stat-label">End</div><div class="stat-value" style="color:var(--green);">${shiftEnd}</div></div>
    <div class="stat-card"><div class="stat-label">Grace</div><div class="stat-value warning">${grace}${grace !== '--' ? 'm' : ''}</div></div>
    <div class="stat-card"><div class="stat-label">Days</div><div class="stat-value">${data.length}</div></div>`;
}

/**
 * Render schedule grid
 */
function renderScheduleGrid(data) {
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  let html = '';
  
  days.forEach(day => {
    const item = data.find(d => d.day === day);
    html += `<div class="schedule-card">
      <div class="day-header"><span>${day}</span><button class="edit-schedule-btn" onclick="openEditScheduleModal('${day}')"><i class="fas fa-pencil-alt"></i></button></div>`;
    
    if (item && item.clockIn !== 'NO SCHEDULE' && item.clockIn !== '--' && item.clockIn) {
      html += `<div class="schedule-item"><span class="label">Start</span><span class="value">${item.clockIn}</span></div>
        <div class="schedule-item"><span class="label">End</span><span class="value">${item.clockOut}</span></div>
        <div class="schedule-item"><span class="label">Grace</span><span class="value">${item.latenessThreshold} mins</span></div>`;
    } else {
      html += `<div style="text-align:center;padding:14px 0;color:var(--text-muted);font-size:13px;"><i class="fas fa-bed"></i> Off Day</div>`;
    }
    
    html += `</div>`;
  });
  
  $('scheduleGridData').innerHTML = html;
}

/**
 * Render schedule table
 */
function renderScheduleTable(data) {
  if (!data.length) {
    $('scheduleTableData').innerHTML = '';
    return;
  }
  
  const todayDay = getTodayDayName();
  let html = `<table><thead><tr><th>Day</th><th>Clock In</th><th>Clock Out</th><th>Grace</th></tr></thead><tbody>`;
  
  data.forEach(s => {
    const isToday = s.day === todayDay ? 'class="today-highlight"' : '';
    html += `<tr ${isToday}>
      <td><strong>${s.day}</strong>${s.day === todayDay ? ' <span class="badge badge-success">Today</span>' : ''}</td>
      <td>${s.clockIn}</td>
      <td>${s.clockOut}</td>
      <td>${s.latenessThreshold}m</td>
    </tr>`;
  });
  
  html += '</tbody></table>';
  $('scheduleTableData').innerHTML = html;
}

/**
 * Open edit schedule modal
 */
function openEditScheduleModal(day) {
  const item = schedule.find(d => d.day === day);
  const isOff = item && item.clockIn === 'NO SCHEDULE';
  const currentIn = item && item.clockIn && item.clockIn !== 'NO SCHEDULE' ? item.clockIn.split(':').slice(0, 2).join(':') : '07:00';
  const currentOut = item && item.clockOut && item.clockOut !== 'NO SCHEDULE' ? item.clockOut.split(':').slice(0, 2).join(':') : '15:15';
  const threshold = item ? (item.latenessThreshold || 0) : 40;
  
  const content = $('editScheduleModalContent');
  content.innerHTML = `
    <div style="font-weight:700;margin-bottom:12px;color:var(--green);">${day}</div>
    <div class="filter-group"><label>Status</label><select id="editScheduleStatus"><option value="active" ${!isOff ? 'selected' : ''}>Working Day</option><option value="no_schedule" ${isOff ? 'selected' : ''}>Off Day</option></select></div>
    <div id="stg1" class="filter-group" style="display:${isOff ? 'none' : 'block'};"><label>Clock In</label><input type="time" id="editClockIn" value="${currentIn}"></div>
    <div id="stg2" class="filter-group" style="display:${isOff ? 'none' : 'block'};"><label>Clock Out</label><input type="time" id="editClockOut" value="${currentOut}"></div>
    <div id="stg3" class="filter-group" style="display:${isOff ? 'none' : 'block'};"><label>Grace (mins)</label><input type="number" id="editThreshold" value="${threshold}"></div>
    <div class="filter-actions"><button class="btn" onclick="closeEditScheduleModal()">Cancel</button><button class="btn btn-primary" onclick="saveSchedule('${day}')">Save</button></div>`;
  
  document.getElementById('editScheduleStatus').addEventListener('change', function () {
    const no = this.value === 'no_schedule';
    document.getElementById('stg1').style.display = no ? 'none' : 'block';
    document.getElementById('stg2').style.display = no ? 'none' : 'block';
    document.getElementById('stg3').style.display = no ? 'none' : 'block';
  });
  
  $('editScheduleModal').classList.add('show');
}

/**
 * Close edit schedule modal
 */
function closeEditScheduleModal() {
  $('editScheduleModal').classList.remove('show');
}

/**
 * Save schedule changes
 */
function saveSchedule(day) {
  const status = document.getElementById('editScheduleStatus').value;
  
  if (status === 'no_schedule') {
    const obj = { day, clockIn: 'NO SCHEDULE', clockOut: 'NO SCHEDULE', latenessThreshold: 0 };
    showLoading(true);
    db.ref('schedule').orderByChild('day').equalTo(day).once('value').then(snap => {
      const key = snap.val() ? Object.keys(snap.val())[0] : null;
      if (key) return db.ref('schedule/' + key).update(obj);
      return db.ref('schedule').push(obj);
    }).then(() => {
      closeEditScheduleModal();
      showLoading(false);
      toast(' Off day set');
    }).catch(e => {
      showLoading(false);
      toast(' Error');
    });
  } else {
    let clockIn = document.getElementById('editClockIn').value;
    let clockOut = document.getElementById('editClockOut').value;
    const threshold = parseInt(document.getElementById('editThreshold').value);
    
    if (!clockIn || !clockOut || isNaN(threshold)) return toast(' Fill all fields');
    if (clockIn.split(':').length > 2) clockIn = clockIn.split(':').slice(0, 2).join(':');
    if (clockOut.split(':').length > 2) clockOut = clockOut.split(':').slice(0, 2).join(':');
    
    const obj = { day, clockIn: clockIn + ':00', clockOut: clockOut + ':00', latenessThreshold: threshold };
    showLoading(true);
    db.ref('schedule').orderByChild('day').equalTo(day).once('value').then(snap => {
      const key = snap.val() ? Object.keys(snap.val())[0] : null;
      if (key) return db.ref('schedule/' + key).update(obj);
      return db.ref('schedule').push(obj);
    }).then(() => {
      closeEditScheduleModal();
      showLoading(false);
      toast(' Saved');
    }).catch(e => {
      showLoading(false);
      toast(' Error');
    });
  }
}