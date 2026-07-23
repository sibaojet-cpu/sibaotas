// ========== USERS MODULE ==========

let userPage = 1;

let filterState = {
  users: { dept: 'all', status: 'all' },
  attendance: { status: 'all' },
  records: { startDate: '', endDate: '', status: 'all' },
  schedule: { day: 'all' }
};

/**
 * Apply user filters
 */
function applyUserFilters() {
  let data = [...users];
  const q = $('userSearch').value.toLowerCase();
  if (q) data = data.filter(u => (u.name || '').toLowerCase().includes(q) || (u.fingerprintId || u.uid || '').toLowerCase().includes(q));
  if (filterState.users.dept !== 'all') data = data.filter(u => u.department === filterState.users.dept);
  if (filterState.users.status !== 'all') data = data.filter(u => u.status === filterState.users.status);
  $('userCountDisplay').textContent = data.length + ' teachers';
  renderUserStats(data);
  renderUserTable(data);
}

/**
 * Render user statistics
 */
function renderUserStats(data) {
  const total = data.length;
  const active = data.filter(u => u.status === 'Active').length;
  const inactive = data.filter(u => u.status === 'Inactive').length;
  const depts = new Set(data.map(u => u.department)).size;
  
  $('userStats').innerHTML = `
    <div class="stat-card"><div class="stat-label">TOTAL TEACHERS</div><div class="stat-value">${total}</div></div>
    <div class="stat-card"><div class="stat-label">ACTIVE</div><div class="stat-value success">${active}</div></div>
    <div class="stat-card"><div class="stat-label">INACTIVE</div><div class="stat-value danger">${inactive}</div></div>
    <div class="stat-card"><div class="stat-label">DEPTS</div><div class="stat-value">${depts}</div></div>`;
}

/**
 * Render user table
 */
function renderUserTable(data) {
  const start = (userPage - 1) * PER_PAGE;
  const end = start + PER_PAGE;
  const page = data.slice(start, end);
  
  if (!page.length) {
    $('userTableData').innerHTML = `<div class="no-data"><i class="fas fa-user-friends"></i><p>No teachers found</p></div>`;
    $('userPagination').innerHTML = '';
    return;
  }
  
  let html = `<table><thead><tr><th>#</th><th>PHOTO</th><th>NAME</th><th>FINGERPRINT ID</th><th>DEPT</th><th>EMAIL</th><th>STATUS</th><th>ACTION</th></tr></thead><tbody>`;
  
  page.forEach((u, index) => {
    const pic = u.profilePhoto
      ? `<img class="profile-img-in-table" src="${u.profilePhoto}" alt="Photo">`
      : `<div class="profile-img-in-table-placeholder"><i class="fas fa-user"></i></div>`;
    const fpId = u.fingerprintId || u.uid || 'N/A';
    
    html += `<tr>
      <td>${start + index + 1}</td>
      <td>${pic}</td>
      <td><strong>${u.name || 'N/A'}</strong></td>
      <td><code style="font-weight:700;color:var(--green);"><i class="fas fa-fingerprint" style="font-size:11px;margin-right:4px;"></i>${fpId}</code></td>
      <td>${u.department || 'N/A'}</td>
      <td><span style="font-size:12px;color:var(--text-secondary);">${u.email || 'N/A'}</span></td>
      <td><span class="badge ${u.status === 'Active' ? 'badge-success' : 'badge-danger'}">${u.status}</span></td>
      <td><div class="action-btns">
        <button class="btn btn-edit btn-xs" onclick="openEditUserModal('${u.key}')"><i class="fas fa-edit"></i> Edit</button>
        <button class="btn btn-delete btn-xs" onclick="removeUser('${u.key}')"><i class="fas fa-trash"></i> Delete</button>
      </div></td>
    </tr>`;
  });
  
  html += '</tbody></table>';
  $('userTableData').innerHTML = html;
  
  const pages = Math.ceil(data.length / PER_PAGE);
  let p = '<div class="pagination">';
  for (let i = 1; i <= Math.min(pages, 10); i++) {
    p += `<button class="page-btn ${i === userPage ? 'active' : ''}" onclick="userPage=${i};applyUserFilters()">${i}</button>`;
  }
  p += '</div>';
  $('userPagination').innerHTML = p;
}

/**
 * Clear user filters
 */
function clearUserFilters() {
  filterState.users = { dept: 'all', status: 'all' };
  $('userSearch').value = '';
  applyUserFilters();
  toast('Filters reset');
}

/**
 * Open add user modal
 */
function openAddUserModal() {
  if (users.length >= MAX_TEACHERS) return toast(` Maximum ${MAX_TEACHERS} teachers`);
  $('addUserModal').classList.add('show');
  $('newUserName').value = '';
  $('newUserFingerprint').value = '';
  $('newUserEmail').value = '';
  $('newUserProfileUrl').value = '';
  $('newUserProfilePreview').style.display = 'none';
  $('newUserProfilePlaceholder').style.display = 'flex';
  $('removeNewPhotoBtn').style.display = 'none';
}

/**
 * Close add user modal
 */
function closeAddUserModal() {
  $('addUserModal').classList.remove('show');
}

/**
 * Add a new teacher
 */
function addUser() {
  if (users.length >= MAX_TEACHERS) return toast(` Maximum ${MAX_TEACHERS} teachers`);
  
  const name = $('newUserName').value.trim();
  const fpId = $('newUserFingerprint').value.trim();
  const dept = $('newUserDept').value;
  const email = $('newUserEmail').value.trim() || 'N/A';
  const profilePhoto = $('newUserProfileUrl').value || null;
  
  if (!name || !fpId) return toast(' Name and Fingerprint ID required');
  if (users.some(t => t.fingerprintId === fpId || t.uid === fpId)) {
    return toast(' Fingerprint ID already registered');
  }
  
  showLoading(true);
  db.ref('teachers').push({
    name,
    fingerprintId: fpId,
    uid: fpId,
    department: dept,
    email,
    status: 'Active',
    profilePhoto,
    createdAt: new Date().toISOString(),
    biometricType: 'fingerprint'
  }).then(() => {
    closeAddUserModal();
    showLoading(false);
    toast(' Teacher added');
    if (fpId) deletePendingFingerprint(fpId);
    clearPendingFingerprint();
  }).catch(e => {
    showLoading(false);
    toast(' Error: ' + e.message);
  });
}

/**
 * Open edit user modal
 */
function openEditUserModal(key) {
  const u = users.find(t => t.key === key);
  if (!u) return;
  
  $('editUserModal').classList.add('show');
  $('editUserKey').value = key;
  $('editUserName').value = u.name || '';
  $('editUserFingerprint').value = u.fingerprintId || u.uid || '';
  $('editUserDept').value = u.department || 'Science';
  $('editUserEmail').value = u.email || '';
  $('editUserStatus').value = u.status || 'Active';
  $('editUserProfileUrl').value = u.profilePhoto || '';
  
  if (u.profilePhoto) {
    $('editUserProfilePreview').src = u.profilePhoto;
    $('editUserProfilePreview').style.display = 'block';
    $('editUserProfilePlaceholder').style.display = 'none';
    $('removeEditPhotoBtn').style.display = 'inline-flex';
  } else {
    $('editUserProfilePreview').style.display = 'none';
    $('editUserProfilePlaceholder').style.display = 'flex';
    $('removeEditPhotoBtn').style.display = 'none';
  }
}

/**
 * Close edit user modal
 */
function closeEditUserModal() {
  $('editUserModal').classList.remove('show');
}

/**
 * Update attendance records for a teacher when their info changes
 */
function updateAttendanceRecordsForTeacher(fingerprintId, name, department, photo) {
  return db.ref('attendance').once('value')
    .then((snapshot) => {
      const updates = {};
      
      if (snapshot.exists()) {
        snapshot.forEach((childSnapshot) => {
          const record = childSnapshot.val();
          const recordKey = childSnapshot.key;
          
          if (record.fingerprintId === fingerprintId || record.uid === fingerprintId) {
            updates[`attendance/${recordKey}/name`] = name;
            updates[`attendance/${recordKey}/department`] = department;
            if (photo) {
              updates[`attendance/${recordKey}/photo`] = photo;
            }
          }
        });
      }
      
      if (Object.keys(updates).length > 0) {
        console.log(`🔄 Updating ${Object.keys(updates).length} attendance records for teacher: ${name}`);
        return db.ref().update(updates);
      }
      
      console.log(`ℹ️ No attendance records found for teacher: ${name}`);
      return Promise.resolve();
    })
    .catch((error) => {
      console.error('❌ Error updating attendance records:', error);
      throw error;
    });
}

/**
 * Update an existing teacher
 */
function updateUser() {
  const key = $('editUserKey').value;
  const name = $('editUserName').value.trim();
  const dept = $('editUserDept').value;
  const email = $('editUserEmail').value.trim() || 'N/A';
  const status = $('editUserStatus').value;
  const photo = $('editUserProfileUrl').value || null;
  
  if (!name) return toast(' Name is required');
  
  const oldTeacher = users.find(t => t.key === key);
  const oldFingerprintId = oldTeacher ? (oldTeacher.fingerprintId || oldTeacher.uid) : null;
  
  showLoading(true);
  
  db.ref('teachers/' + key).update({
    name,
    department: dept,
    email,
    status,
    profilePhoto: photo
  }).then(() => {
    if (oldFingerprintId) {
      return updateAttendanceRecordsForTeacher(oldFingerprintId, name, dept, photo);
    }
    return Promise.resolve();
  }).then(() => {
    closeEditUserModal();
    showLoading(false);
    toast(' Teacher updated - All records synced');
  }).catch(e => {
    showLoading(false);
    toast(' Error: ' + e.message);
  });
}

/**
 * Remove a teacher
 */
function removeUser(key) {
  if (!confirm('Delete this teacher?')) return;
  db.ref('teachers/' + key).remove()
    .then(() => toast(' Teacher removed'))
    .catch(e => toast(' Error: ' + e.message));
}

/**
 * Export users to CSV
 */
function exportUsersCSV() {
  if (!users.length) return toast(' No teachers');
  let csv = 'Name,Fingerprint ID,Department,Email,Status\n';
  users.forEach(t => {
    const fpId = t.fingerprintId || t.uid || 'N/A';
    csv += `"${(t.name || '').replace(/"/g, '""')}","${fpId}","${(t.department || '').replace(/"/g, '""')}","${(t.email || '').replace(/"/g, '""')}","${(t.status || '').replace(/"/g, '""')}"\n`;
  });
  downloadCSV(csv, 'sibao_teachers_export.csv');
}