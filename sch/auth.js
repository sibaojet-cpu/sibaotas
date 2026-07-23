// ========== AUTHENTICATION MODULE ==========

const loginPage = document.getElementById('loginPage');
const mainApp = document.getElementById('mainApp');
const alertBox = document.getElementById('loginAlert');
const alertMsg = document.getElementById('alertMessage');
const idInput = document.getElementById('loginId');
const passInput = document.getElementById('loginPassword');

/**
 * Create default admin if none exists
 */
function createDefaultAdminIfNeeded() {
  const defaultAdmin = {
    uid: "admin123",
    password: "password123",
    name: "Administrator",
    role: "admin",
    email: "admin@sibao.sch.ng"
  };
  
  db.ref('admins').orderByChild('uid').equalTo('admin123').once('value')
    .then((snapshot) => {
      if (!snapshot.exists()) {
        console.log('📝 No admin found. Creating default admin for first login.');
        console.log('⚠️ You should change this admin in Firebase Console after login.');
        db.ref('admins').push(defaultAdmin);
      }
    })
    .catch(() => {});
}

/**
 * Show login alert
 */
function showAlert(msg, isSuccess = false) {
  alertMsg.textContent = msg;
  alertBox.classList.add('show');
  if (isSuccess) {
    alertBox.classList.add('success');
  } else {
    alertBox.classList.remove('success');
  }
  clearTimeout(window.alertTimeout);
  window.alertTimeout = setTimeout(() => {
    alertBox.classList.remove('show');
    alertBox.classList.remove('success');
  }, 4000);
}

/**
 * Handle login form submission
 */
function handleLogin(e) {
  e.preventDefault();
  const adminId = idInput.value.trim();
  const password = passInput.value.trim();

  if (!adminId || !password) {
    showAlert('Please enter both Admin ID and Password.');
    return false;
  }

  showAlert(' Verifying credentials...', false);

  db.ref('admins').orderByChild('uid').equalTo(adminId).once('value')
    .then((snapshot) => {
      const data = snapshot.val();
      if (!data) {
        showAlert(' Admin ID not found. Please check and try again.');
        return;
      }

      let found = false;
      let adminData = null;
      for (const [key, admin] of Object.entries(data)) {
        if (admin.uid === adminId && admin.password === password) {
          found = true;
          adminData = { key, ...admin };
          break;
        }
      }

      if (found && adminData) {
        showAlert(' Welcome ' + adminData.name + '!', true);
        
        sessionStorage.setItem('sibao_admin_id', adminId);
        sessionStorage.setItem('sibao_admin_name', adminData.name || 'Administrator');
        sessionStorage.setItem('sibao_admin_role', adminData.role || 'admin');
        sessionStorage.setItem('sibao_admin_key', adminData.key);
        sessionStorage.setItem('sibao_auth', 'true');
        
        setTimeout(() => {
          loginPage.style.display = 'none';
          mainApp.classList.add('visible');
          initializeAllNodes();
          setTimeout(startLiveSync, 500);
        }, 800);
      } else {
        showAlert(' Incorrect password. Please try again.');
      }
    })
    .catch((error) => {
      console.error('Login error:', error);
      showAlert(' Database error: ' + error.message);
    });

  return false;
}

/**
 * Logout the current admin
 */
function logout() {
  if (!confirm('Are you sure you want to logout?')) return;
  sessionStorage.removeItem('sibao_auth');
  sessionStorage.removeItem('sibao_admin_id');
  sessionStorage.removeItem('sibao_admin_name');
  sessionStorage.removeItem('sibao_admin_role');
  sessionStorage.removeItem('sibao_admin_key');
  mainApp.classList.remove('visible');
  loginPage.style.display = 'flex';
  idInput.value = '';
  passInput.value = '';
}

/**
 * Initialize all database nodes
 */
function initializeAllNodes() {
  console.log('🔧 Checking database structure...');
  console.log('📝 No automatic data creation - You create everything manually!');
  
  const nodesToCheck = ['pending_fingerprints', 'teachers', 'attendance', 'schedule', 'admins', 'pending_cards', 'daily_attendance'];
  
  nodesToCheck.forEach(node => {
    db.ref(node).once('value')
      .then((snapshot) => {
        if (!snapshot.exists()) {
          console.log(`📁 ${node} node does NOT exist. You need to create it manually.`);
        } else {
          console.log(`✅ ${node} node exists.`);
        }
      })
      .catch((error) => {
        console.error(`❌ Error checking ${node}:`, error);
      });
  });
}

/**
 * Check authentication state on page load
 */
window.addEventListener('load', function() {
  if (sessionStorage.getItem('sibao_auth') === 'true') {
    loginPage.style.display = 'none';
    mainApp.classList.add('visible');
    initializeAllNodes();
    setTimeout(startLiveSync, 500);
  } else {
    createDefaultAdminIfNeeded();
  }
});