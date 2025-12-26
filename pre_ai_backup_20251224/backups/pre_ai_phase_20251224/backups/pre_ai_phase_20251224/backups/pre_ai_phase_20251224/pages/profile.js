/**
 * User Profile Page
 */

window.renderProfile = function () {
    const user = window.Session?.getUser();

    if (!user) {
        return '<p>No user session found</p>';
    }

    return `
    <div class="profile-page">
      <div class="profile-header">
        <h1>User Profile</h1>
        <button class="btn-secondary" onclick="router.navigate('/')">← Back to Dashboard</button>
      </div>
      
      <div class="profile-content">
        <div class="profile-card">
          <div class="profile-avatar">
            ${user.avatar ? `<img src="${user.avatar}" alt="${user.name}">` : '<div class="avatar-placeholder">' + (user.name.charAt(0).toUpperCase()) + '</div>'}
          </div>
          
          <div class="profile-info">
            <h2>${user.name}</h2>
            <p class="user-email">${user.email}</p>
            ${user.workspace ? `<p class="user-workspace">📁 ${user.workspace}</p>` : ''}
          </div>
        </div>
        
        <div class="profile-section">
          <h3>Account Settings</h3>
          
          <div class="settings-list">
            <div class="setting-item">
              <div>
                <strong>Email</strong>
                <p>${user.email}</p>
              </div>
              <button class="btn-secondary btn-sm">Change</button>
            </div>
            
            <div class="setting-item">
              <div>
                <strong>Password</strong>
                <p>••••••••</p>
              </div>
              <button class="btn-secondary btn-sm" onclick="changePassword()">Change</button>
            </div>
            
            <div class="setting-item">
              <div>
                <strong>Workspace</strong>
                <p>${user.workspace || 'Default Workspace'}</p>
              </div>
              <button class="btn-secondary btn-sm">Manage</button>
            </div>
          </div>
        </div>
        
        <div class="profile-section">
          <h3>Session Info</h3>
          <div class="session-info">
            <p><strong>User ID:</strong> ${user.id}</p>
            ${user.provider ? `<p><strong>Sign-in Method:</strong> ${user.provider}</p>` : ''}
            <p><strong>Status:</strong> <span class="status-active">● Active</span></p>
          </div>
        </div>
        
        <div class="profile-actions">
          <button class="btn-danger" onclick="confirmLogout()">
            🚪 Logout
          </button>
        </div>
      </div>
    </div>
    
    <script>
      function confirmLogout() {
        if (confirm('Are you sure you want to logout?')) {
          window.Session.logout();
        }
      }
      
      function changePassword() {
        alert('Password change functionality coming soon!');
      }
    </script>
  `;
};
