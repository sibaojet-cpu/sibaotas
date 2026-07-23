// ========== FINGERPRINT MODULE ==========

let pendingFingerprint = null;
let pendingFingerprintTimer = null;
let pendingFingerprintCountdown = 10;

/**
 * Show pending fingerprint notification
 */
function showPendingFingerprint(fpId) {
  pendingFingerprint = fpId;
  pendingFingerprintCountdown = 10;
  
  const notification = document.getElementById('pendingFingerprintNotification');
  const display = document.getElementById('pendingFingerprintDisplay');
  const timer = document.getElementById('pendingFingerprintTimer');
  
  display.textContent = fpId;
  timer.textContent = '10s';
  notification.classList.add('show');
  
  if (pendingFingerprintTimer) {
    clearInterval(pendingFingerprintTimer);
    pendingFingerprintTimer = null;
  }
  
  pendingFingerprintTimer = setInterval(() => {
    pendingFingerprintCountdown--;
    timer.textContent = pendingFingerprintCountdown + 's';
    
    if (pendingFingerprintCountdown <= 0) {
      clearInterval(pendingFingerprintTimer);
      pendingFingerprintTimer = null;
      clearPendingFingerprint();
      toast(' Fingerprint ID expired (10s)');
      deletePendingFingerprint(fpId);
    }
  }, 1000);
}

/**
 * Clear pending fingerprint notification
 */
function clearPendingFingerprint() {
  pendingFingerprint = null;
  document.getElementById('pendingFingerprintNotification').classList.remove('show');
  if (pendingFingerprintTimer) {
    clearInterval(pendingFingerprintTimer);
    pendingFingerprintTimer = null;
  }
}

/**
 * Auto-fill fingerprint ID in the add user form
 */
function autoFillFingerprintID() {
  if (!pendingFingerprint) {
    toast(' No pending fingerprint detected');
    return;
  }
  
  if (users.some(u => u.fingerprintId === pendingFingerprint || u.uid === pendingFingerprint)) {
    toast(' Fingerprint ID already registered');
    return;
  }
  
  openAddUserModal();
  const fpInput = document.getElementById('newUserFingerprint');
  fpInput.value = pendingFingerprint;
  clearPendingFingerprint();
  toast(' Fingerprint ID auto-filled! Please complete the form.');
}

/**
 * Delete a pending fingerprint from the database
 */
function deletePendingFingerprint(fpId) {
  if (!fpId) return;
  
  db.ref('pending_fingerprints').orderByChild('fingerprintId').equalTo(fpId).once('value')
    .then((snapshot) => {
      if (snapshot.val()) {
        Object.keys(snapshot.val()).forEach(key => {
          db.ref('pending_fingerprints/' + key).remove().catch(() => {});
        });
      }
    }).catch(() => {});
  
  const cleanId = fpId.replace('FP-', '');
  db.ref('pending_cards').orderByChild('uid').equalTo(cleanId).once('value')
    .then((snapshot) => {
      if (snapshot.val()) {
        Object.keys(snapshot.val()).forEach(key => {
          db.ref('pending_cards/' + key).remove().catch(() => {});
        });
      }
    }).catch(() => {});
}

/**
 * Watch for pending fingerprints from the Arduino scanner
 */
function watchPendingFingerprints() {
  db.ref('pending_fingerprints').on('child_added', (snapshot) => {
    const data = snapshot.val();
    if (data && data.fingerprintId && data.fingerprintId !== '_init') {
      const fpId = data.fingerprintId.trim();
      if (users.some(u => u.fingerprintId === fpId || u.uid === fpId)) {
        deletePendingFingerprint(fpId);
        return;
      }
      showPendingFingerprint(fpId);
    }
  });

  db.ref('pending_cards').on('child_added', (snapshot) => {
    const data = snapshot.val();
    if (data && data.uid && data.uid !== '_init') {
      let fpId = data.uid;
      if (!fpId.startsWith('FP-')) fpId = 'FP-' + fpId;
      
      if (users.some(u => u.fingerprintId === fpId || u.uid === fpId)) {
        db.ref('pending_cards/' + snapshot.key).remove().catch(() => {});
        return;
      }
      
      db.ref('pending_fingerprints').orderByChild('fingerprintId').equalTo(fpId).once('value')
        .then((snap) => {
          if (!snap.exists()) {
            const newRef = db.ref('pending_fingerprints').push();
            return newRef.set({
              fingerprintId: fpId,
              timestamp: data.timestamp || new Date().toISOString(),
              status: 'pending',
              source: 'arduino'
            });
          }
          return Promise.resolve();
        })
        .then(() => {
          if (snapshot.key && snapshot.key !== '_init') {
            db.ref('pending_cards/' + snapshot.key).remove().catch(() => {});
          }
        })
        .catch(() => {});
    }
  });
}