// ========== UTILITY FUNCTIONS ==========

/**
 * Helper to get element by ID
 */
function $(id) {
  return document.getElementById(id);
}

/**
 * Show/hide loading overlay
 */
function showLoading(show) {
  $('loadingOverlay').classList.toggle('show', show);
}

/**
 * Show a toast notification
 */
function toast(msg) {
  const t = document.createElement('div');
  t.className = 'toast';
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => {
    t.style.opacity = '0';
    setTimeout(() => t.remove(), 300);
  }, 2800);
}

/**
 * Get today's date in YYYY-MM-DD format
 */
function getTodayDate() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * Get today's day name (e.g., "Monday")
 */
function getTodayDayName() {
  return ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][new Date().getDay()];
}

/**
 * Find a schedule entry for a given day name
 */
function getScheduleForDay(dayName) {
  return schedule.find(s => s.day === dayName);
}

/**
 * Get a teacher's profile photo by fingerprint ID
 */
function getUserPhoto(fpId) {
  const u = users.find(t => t.fingerprintId === fpId || t.uid === fpId);
  return u ? u.profilePhoto : null;
}

/**
 * Get a teacher's name by fingerprint ID
 */
function getUserName(fpId) {
  const u = users.find(t => t.fingerprintId === fpId || t.uid === fpId);
  return u ? u.name : null;
}

/**
 * Get a teacher's department by fingerprint ID
 */
function getUserDepartment(fpId) {
  const u = users.find(t => t.fingerprintId === fpId || t.uid === fpId);
  return u ? u.department : null;
}

/**
 * Determine attendance status based on clock-in time and schedule
 */
function determineStatusFromSchedule(clockInTime, dateStr) {
  if (!clockInTime || clockInTime === '--' || clockInTime === 'NO SCHEDULE') return 'NO SCHEDULE';
  
  const today = getTodayDate();
  if (dateStr !== today) return null;
  
  const d = new Date(dateStr + 'T00:00:00');
  const dayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][d.getDay()];
  const daySchedule = getScheduleForDay(dayName);
  
  if (!daySchedule || !daySchedule.clockIn || daySchedule.clockIn === '--' || daySchedule.clockIn === 'NO SCHEDULE') {
    return 'NO SCHEDULE';
  }
  
  const threshold = daySchedule.latenessThreshold || 40;
  const sch = daySchedule.clockIn || '07:00:00';
  const c = clockInTime.split(':');
  const s = sch.split(':');
  const cMin = parseInt(c[0]) * 60 + parseInt(c[1]) + (parseInt(c[2]) || 0) / 60;
  const sMin = parseInt(s[0]) * 60 + parseInt(s[1]) + (parseInt(s[2]) || 0) / 60;
  const diff = cMin - sMin;
  
  if (diff < 0) return 'EARLY';
  if (diff <= threshold) return 'ON TIME';
  return 'LATE';
}

/**
 * Merge raw attendance records into structured format
 */
function mergeAttendanceRecords(data) {
  const merged = {};
  const sortedData = [...data].sort((a, b) => (a.timestamp || '').localeCompare(b.timestamp || ''));
  
  sortedData.forEach(record => {
    if (!record.timestamp) return;
    const parts = record.timestamp.split(' ');
    if (parts.length < 2) return;
    const date = parts[0];
    const time = parts[1];
    const uid = record.uid || record.fingerprintId || 'unknown';
    const key = `${uid}_${date}`;
    let action = record.action || 'IN';
    
    if (!merged[key]) {
      merged[key] = {
        fingerprintId: uid,
        name: record.name || getUserName(uid) || 'Unknown',
        department: record.department || getUserDepartment(uid) || 'N/A',
        date: date,
        clockIn: '--',
        clockOut: '--',
        status: record.status || 'PENDING',
        photo: getUserPhoto(uid)
      };
    }
    
    if (action === 'IN' || action === 'in') {
      if (merged[key].clockIn === '--') {
        merged[key].clockIn = time;
        const newStatus = determineStatusFromSchedule(time, date);
        merged[key].status = newStatus !== null ? newStatus : (record.status || 'PENDING');
      }
    } else if (action === 'OUT' || action === 'out') {
      merged[key].clockOut = time;
      if (merged[key].clockIn !== '--' && merged[key].status === 'PENDING') {
        const newStatus = determineStatusFromSchedule(merged[key].clockIn, date);
        if (newStatus !== null) merged[key].status = newStatus;
      }
    }
  });
  
  return Object.values(merged);
}

/**
 * Download data as CSV file
 */
function downloadCSV(csv, name) {
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.style.display = 'none';
  document.body.appendChild(a);
  setTimeout(() => {
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast(' Download started');
    }, 100);
  }, 100);
}

/**
 * Toggle sidebar open/close
 */
function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
  document.getElementById('sidebarOverlay').classList.toggle('show');
}

/**
 * Close sidebar
 */
function closeSidebar() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sidebarOverlay').classList.remove('show');
}

/**
 * Handle file upload to Cloudinary
 */
function handleFileUpload(type, input) {
  const file = input.files[0];
  if (!file) return;
  
  showLoading(true);
  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
  
  fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, {
    method: 'POST',
    body: formData
  })
    .then(res => res.json())
    .then(data => {
      showLoading(false);
      if (data.secure_url) {
        const url = data.secure_url;
        if (type === 'new') {
          $('newUserProfileUrl').value = url;
          $('newUserProfilePreview').src = url;
          $('newUserProfilePreview').style.display = 'block';
          if ($('newUserProfilePlaceholder')) $('newUserProfilePlaceholder').style.display = 'none';
          $('removeNewPhotoBtn').style.display = 'inline-flex';
        } else {
          $('editUserProfileUrl').value = url;
          $('editUserProfilePreview').src = url;
          $('editUserProfilePreview').style.display = 'block';
          if ($('editUserProfilePlaceholder')) $('editUserProfilePlaceholder').style.display = 'none';
          $('removeEditPhotoBtn').style.display = 'inline-flex';
        }
        toast(' Photo uploaded');
      } else {
        toast(' Upload failed');
      }
      input.value = '';
    })
    .catch(e => {
      showLoading(false);
      toast(' Upload failed');
      input.value = '';
    });
}

/**
 * Remove new user photo
 */
function removeNewUserPhoto() {
  $('newUserProfileUrl').value = '';
  $('newUserProfilePreview').style.display = 'none';
  $('newUserProfilePlaceholder').style.display = 'flex';
  $('removeNewPhotoBtn').style.display = 'none';
  toast(' Photo removed');
}

/**
 * Remove edit user photo
 */
function removeEditUserPhoto() {
  $('editUserProfileUrl').value = '';
  $('editUserProfilePreview').style.display = 'none';
  $('editUserProfilePlaceholder').style.display = 'flex';
  $('removeEditPhotoBtn').style.display = 'none';
  toast(' Photo removed');
}

/**
 * Update home page statistics
 */
function updateHomeStats() {
  const merged = mergeAttendanceRecords(attendance);
  $('totalTodayHome').textContent = merged.filter(a => a.clockIn !== '--').length;
  $('totalLateHome').textContent = merged.filter(a => a.status === 'LATE').length;
  $('totalDaysHome').textContent = schedule.filter(s => s.clockIn !== 'NO SCHEDULE' && s.clockIn && s.clockIn !== '--').length;
}