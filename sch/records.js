// ========== RECORDS MODULE ==========

let recordsPage = 1;

/**
 * Apply records filters
 */
function applyRecordsFilters() {
  let mergedData = mergeAttendanceRecords(records);
  let data = [...mergedData];
  const q = $('recordsSearch').value.toLowerCase();
  if (q) data = data.filter(r => (r.name || '').toLowerCase().includes(q) || (r.fingerprintId || '').toLowerCase().includes(q));
  if (filterState.records.startDate) data = data.filter(r => r.date && r.date >= filterState.records.startDate);
  if (filterState.records.endDate) data = data.filter(r => r.date && r.date <= filterState.records.endDate);
  if (filterState.records.status !== 'all') data = data.filter(r => r.status === filterState.records.status);
  data.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  $('recordsCountDisplay').textContent = data.length + ' records';
  renderRecordsStats(data);
  renderRecordsTable(data);
}

/**
 * Render records statistics
 */
function renderRecordsStats(data) {
  const total = data.length;
  const late = data.filter(r => r.status === 'LATE').length;
  const earlyOntime = data.filter(r => r.status === 'EARLY' || r.status === 'ON TIME').length;
  const uniqueTeachers = new Set(data.map(r => r.fingerprintId)).size;
  
  $('recordsStats').innerHTML = `
    <div class="stat-card"><div class="stat-label">TOTAL</div><div class="stat-value">${total}</div></div>
    <div class="stat-card"><div class="stat-label">LATE</div><div class="stat-value warning">${late}</div></div>
    <div class="stat-card"><div class="stat-label" style="color:var(--green);">EARLY / ON TIME</div><div class="stat-value" style="color:var(--green);">${earlyOntime}</div></div>
    <div class="stat-card"><div class="stat-label">UNIQUE TEACHERS</div><div class="stat-value">${uniqueTeachers}</div></div>`;
}

/**
 * Render records table
 */
function renderRecordsTable(data) {
  const start = (recordsPage - 1) * PER_PAGE;
  const end = start + PER_PAGE;
  const page = data.slice(start, end);
  
  if (!page.length) {
    $('recordsTableData').innerHTML = `<div class="no-data"><i class="fas fa-history"></i><p>No records found</p></div>`;
    $('recordsPagination').innerHTML = '';
    return;
  }
  
  let html = `<table><thead><tr><th>#</th><th>PHOTO</th><th>DATE</th><th>NAME</th><th>FINGERPRINT</th><th>IN</th><th>OUT</th><th>STATUS</th></tr></thead><tbody>`;
  
  page.forEach((r, index) => {
    const photo = getUserPhoto(r.fingerprintId);
    const photoHtml = photo
      ? `<img class="profile-img-in-table" src="${photo}" alt="Photo">`
      : `<div class="profile-img-in-table-placeholder"><i class="fas fa-user"></i></div>`;
    
    let bClass = 'badge-muted';
    if (r.status === 'ON TIME' || r.status === 'EARLY') bClass = 'badge-success';
    if (r.status === 'LATE') bClass = 'badge-warning';
    if (r.status === 'NO SCHEDULE') bClass = 'badge-schedule';
    
    html += `<tr>
      <td>${start + index + 1}</td>
      <td>${photoHtml}</td>
      <td>${r.date || '--'}</td>
      <td><strong>${r.name || 'Teacher'}</strong></td>
      <td><code style="font-weight:600;color:var(--green);"><i class="fas fa-fingerprint" style="font-size:11px;margin-right:4px;"></i>${r.fingerprintId}</code></td>
      <td><span style="color:var(--green);">${r.clockIn}</span></td>
      <td><span style="color:var(--danger);">${r.clockOut}</span></td>
      <td><span class="badge ${bClass}">${r.status || 'PENDING'}</span></td>
    </tr>`;
  });
  
  html += '</tbody></table>';
  $('recordsTableData').innerHTML = html;
  
  const pages = Math.ceil(data.length / PER_PAGE);
  let p = '<div class="pagination">';
  for (let i = 1; i <= Math.min(pages, 10); i++) {
    p += `<button class="page-btn ${i === recordsPage ? 'active' : ''}" onclick="recordsPage=${i};applyRecordsFilters()">${i}</button>`;
  }
  p += '</div>';
  $('recordsPagination').innerHTML = p;
}

/**
 * Clear records filters
 */
function clearRecordsFilters() {
  filterState.records = { startDate: '', endDate: '', status: 'all' };
  $('recordsSearch').value = '';
  applyRecordsFilters();
  toast('Filters cleared');
}

/**
 * Export records to CSV
 */
function exportRecordsCSV() {
  let mergedData = mergeAttendanceRecords(records);
  if (!mergedData.length) return toast(' No records');
  let csv = 'Date,Name,Department,Fingerprint ID,Clock In,Clock Out,Status\n';
  mergedData.forEach(r => {
    csv += `"${r.date || '--'}","${(r.name || '').replace(/"/g, '""')}","${(r.department || '').replace(/"/g, '""')}","${r.fingerprintId}","${r.clockIn || '--'}","${r.clockOut || '--'}","${r.status || 'PENDING'}"\n`;
  });
  downloadCSV(csv, 'sibao_attendance_history.csv');
}