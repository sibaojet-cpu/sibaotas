// ========== ATTENDANCE MODULE ==========

let attendancePage = 1;

/**
 * Apply attendance filters
 */
function applyAttendanceFilters() {
  let mergedData = mergeAttendanceRecords(attendance);
  let data = [...mergedData];
  const q = $('attendanceSearch').value.toLowerCase();
  if (q) data = data.filter(a => (a.name || '').toLowerCase().includes(q) || (a.fingerprintId || '').toLowerCase().includes(q));
  if (filterState.attendance.status !== 'all') data = data.filter(a => a.status === filterState.attendance.status);
  $('attendanceCountDisplay').textContent = data.length + ' records';
  renderAttendanceStats(data);
  renderAttendanceTable(data);
}

/**
 * Render attendance statistics
 */
function renderAttendanceStats(data) {
  const present = data.filter(a => a.clockIn !== '--').length;
  const late = data.filter(a => a.status === 'LATE').length;
  const earlyOntime = data.filter(a => a.status === 'EARLY' || a.status === 'ON TIME').length;
  const notYet = Math.max(0, users.length - present);
  
  $('attendanceStats').innerHTML = `
    <div class="stat-card"><div class="stat-label">PRESENT TODAY</div><div class="stat-value success">${present}</div></div>
    <div class="stat-card"><div class="stat-label">LATE</div><div class="stat-value warning">${late}</div></div>
    <div class="stat-card"><div class="stat-label" style="color:var(--green);">EARLY / ON TIME</div><div class="stat-value" style="color:var(--green);">${earlyOntime}</div></div>
    <div class="stat-card"><div class="stat-label">NOT YET IN</div><div class="stat-value danger">${notYet}</div></div>`;
}

/**
 * Render attendance table
 */
function renderAttendanceTable(data) {
  const start = (attendancePage - 1) * PER_PAGE;
  const end = start + PER_PAGE;
  const page = data.slice(start, end);
  
  if (!page.length) {
    $('attendanceTableData').innerHTML = `<div class="no-data"><i class="fas fa-clipboard-list"></i><p>No records today</p></div>`;
    $('attendancePagination').innerHTML = '';
    return;
  }
  
  let html = `<table><thead><tr><th>#</th><th>PHOTO</th><th>DATE</th><th>NAME</th><th>FINGERPRINT</th><th>IN</th><th>OUT</th><th>STATUS</th></tr></thead><tbody>`;
  
  page.forEach((a, index) => {
    const photo = getUserPhoto(a.fingerprintId);
    const photoHtml = photo
      ? `<img class="profile-img-in-table" src="${photo}" alt="Photo">`
      : `<div class="profile-img-in-table-placeholder"><i class="fas fa-user"></i></div>`;
    
    let bClass = 'badge-muted';
    if (a.status === 'ON TIME' || a.status === 'EARLY') bClass = 'badge-success';
    if (a.status === 'LATE') bClass = 'badge-warning';
    if (a.status === 'NO SCHEDULE') bClass = 'badge-schedule';
    
    html += `<tr>
      <td>${start + index + 1}</td>
      <td>${photoHtml}</td>
      <td>${a.date || getTodayDate()}</td>
      <td><strong>${a.name || 'Teacher'}</strong></td>
      <td><code style="font-weight:600;color:var(--green);"><i class="fas fa-fingerprint" style="font-size:11px;margin-right:4px;"></i>${a.fingerprintId}</code></td>
      <td><span style="font-weight:600;color:var(--green);">${a.clockIn}</span></td>
      <td><span style="font-weight:600;color:var(--danger);">${a.clockOut}</span></td>
      <td><span class="badge ${bClass}">${a.status || 'PENDING'}</span></td>
    </tr>`;
  });
  
  html += '</tbody></table>';
  $('attendanceTableData').innerHTML = html;
  
  const pages = Math.ceil(data.length / PER_PAGE);
  let p = '<div class="pagination">';
  for (let i = 1; i <= Math.min(pages, 10); i++) {
    p += `<button class="page-btn ${i === attendancePage ? 'active' : ''}" onclick="attendancePage=${i};applyAttendanceFilters()">${i}</button>`;
  }
  p += '</div>';
  $('attendancePagination').innerHTML = p;
}

/**
 * Clear attendance filters
 */
function clearAttendanceFilters() {
  filterState.attendance = { status: 'all' };
  $('attendanceSearch').value = '';
  applyAttendanceFilters();
  toast('Filters reset');
}

/**
 * Export attendance to CSV
 */
function exportAttendanceCSV() {
  let mergedData = mergeAttendanceRecords(attendance);
  if (!mergedData.length) return toast(' No attendance records');
  let csv = 'Date,Name,Department,Fingerprint ID,Clock In,Clock Out,Status\n';
  mergedData.forEach(r => {
    csv += `"${r.date || getTodayDate()}","${(r.name || '').replace(/"/g, '""')}","${(r.department || '').replace(/"/g, '""')}","${r.fingerprintId}","${r.clockIn || '--'}","${r.clockOut || '--'}","${r.status || 'PENDING'}"\n`;
  });
  downloadCSV(csv, 'sibao_attendance_today.csv');
}