import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';

// Define the custom colors based on the user's provided CSS variables
const COLORS = {
  BG: '#1a1a2e',
  CARD: '#2b2b40',
  ACCENT_1: '#b860ff', // Purple
  ACCENT_2: '#8aff8a', // Neon Green
  TEXT: '#f0f0f0',
  SUBTLE_TEXT: '#ccc',
};

// Create a local API instance to avoid relative path import errors
const api = axios.create({
  baseURL: '/api',
});

// Utility function to format date for display
const formatDate = (dateString) => {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
  });
};

export default function Dashboard({ token, onLogout }) {
  const [selectedGenres, setSelectedGenres] = useState(new Set());
  const [title, setTitle] = useState('');
  const [hints, setHints] = useState('');
  const [story, setStory] = useState(null);
  const [storiesHistory, setStoriesHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [currentView, setCurrentView] = useState('generator');
  const [showUserDetails, setShowUserDetails] = useState(false);
  
  // User profile state
  const [userProfile, setUserProfile] = useState(null);
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({
    username: '',
    email: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  }); 
  
  // Story editing state
  const [editingStory, setEditingStory] = useState(false);
  const [editContent, setEditContent] = useState('');
  const [editPrompts, setEditPrompts] = useState('');
  const [savingStory, setSavingStory] = useState(false);

  const genres = ['Fantasy', 'Sci-Fi', 'Horror', 'Comedy', 'Mystery', 'Romance', 'Adventure', 'Thriller', 'Dystopian'];

  // Set auth token header globally and fetch history and user profile on component mount
  useEffect(() => {
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    fetchHistory();
    fetchUserProfile();
  }, [token]);

  // Fetch user profile from backend
  const fetchUserProfile = async () => {
    try {
      const res = await api.get('/auth/profile');
      setUserProfile(res.data);
      setProfileForm(prev => ({
        ...prev,
        username: res.data.username,
        email: res.data.email
      }));
    } catch (err) {
      console.error('Failed to fetch user profile:', err);
      setErrorMessage('Failed to load user profile.');
    }
  };

  // Handle profile form changes
  const handleProfileChange = (e) => {
    const { name, value } = e.target;
    setProfileForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Update user profile
  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    if (profileForm.newPassword && profileForm.newPassword !== profileForm.confirmPassword) {
      setErrorMessage('New passwords do not match');
      return;
    }

    try {
      const updateData = {
        username: profileForm.username,
        email: profileForm.email
      };

      if (profileForm.currentPassword) {
        updateData.currentPassword = profileForm.currentPassword;
        updateData.newPassword = profileForm.newPassword;
      }

      const res = await api.put('/auth/profile', updateData);
      setUserProfile(res.data.user);
      setEditingProfile(false);
      setProfileForm(prev => ({
        ...prev,
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      }));
      setErrorMessage('Profile updated successfully!');
    } catch (err) {
      setErrorMessage(err.response?.data?.msg || 'Failed to update profile');
    }
  };

  // Get display name for the profile button
  const userIdDisplay = useMemo(() => {
    return userProfile ? userProfile.username : 'Guest';
  }, [userProfile]);


  // --- Data Fetching for History ---
  const fetchHistory = async () => {
    setErrorMessage('');
    try {
      const res = await api.get('/stories');
      // Sort stories by creation date, newest first (optional, but good practice)
      const sortedStories = res.data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setStoriesHistory(sortedStories);
    } catch (err) {
      console.error('Failed to fetch history:', err);
      setErrorMessage('Failed to load story history.');
    }
  };


  const toggleGenre = (g) => {
    const s = new Set(selectedGenres);
    if (s.has(g)) s.delete(g); else s.add(g);
    setSelectedGenres(s);
  };

  const handleGenerate = async () => {
    if (!title || !hints || selectedGenres.size === 0) {
      setErrorMessage('Please provide a title, hints, and select at least one genre.');
      return;
    }
    
    setErrorMessage('');
    setLoading(true);

    try {
      const res = await api.post('/stories', {
        title,
        hints,
        genres: Array.from(selectedGenres)
      });

      setStory(res.data); 
      setTitle('');
      setHints('');
      setSelectedGenres(new Set());
      
      fetchHistory();
      setCurrentView('generator');

    } catch (err) {
      const msg = err.response?.data?.msg || 'An unknown error occurred during story generation.';
      setErrorMessage(msg);
      setStory(null);
    } finally {
      setLoading(false);
    }
  };

  // --- Story Editing Handlers ---
  const openEditStory = (s) => {
    setStory(s);
    setEditContent(s.content || '');
    setEditPrompts('');
    setEditingStory(true);
  };

  const cancelEditStory = () => {
    setEditingStory(false);
    setEditContent('');
    setEditPrompts('');
    setErrorMessage('');
  };

  const saveEditedStory = async () => {
    if (!story || !story._id) return;
    setSavingStory(true);
    setErrorMessage('');
    try {
      const res = await api.put(`/stories/${story._id}`, { content: editContent });
      setStory(res.data);
      setEditingStory(false);
      fetchHistory();
      setErrorMessage('Story saved successfully.');
    } catch (err) {
      setErrorMessage(err.response?.data?.msg || 'Failed to save story');
    } finally {
      setSavingStory(false);
    }
  };

  const regenerateEditedStory = async () => {
    if (!story || !story._id) return;
    if (!editPrompts || editPrompts.trim().length === 0) {
      setErrorMessage('Please provide prompts to regenerate the story.');
      return;
    }
    setSavingStory(true);
    setErrorMessage('');
    try {
      const res = await api.put(`/stories/${story._id}`, { prompts: editPrompts });
      setStory(res.data);
      setEditContent(res.data.content || '');
      setEditingStory(false);
      fetchHistory();
      setErrorMessage('Story regenerated successfully.');
    } catch (err) {
      setErrorMessage(err.response?.data?.msg || 'Failed to regenerate story');
    } finally {
      setSavingStory(false);
    }
  };

  // --- Rendering Functions ---

  const renderUserDetailsModal = () => (
    <div className="modal-overlay" onClick={() => setShowUserDetails(false)}>
        <div className="modal-content card" onClick={e => e.stopPropagation()}>
            <h2>{editingProfile ? 'Edit Profile' : 'User Profile'}</h2>
            
            {!editingProfile ? (
              // View Mode
              <div className="profile-info">
                <div className="info-group">
                  <label>Username</label>
                  <p>{userProfile?.username}</p>
                </div>
                <div className="info-group">
                  <label>Email</label>
                  <p>{userProfile?.email}</p>
                </div>
                <div className="info-group">
                  <label>Member Since</label>
                  <p>{new Date(userProfile?.createdAt).toLocaleDateString()}</p>
                </div>
                <div className="info-group">
                  <label>Stories Created</label>
                  <p>{storiesHistory.length}</p>
                </div>
                <button 
                  className="action-btn primary-btn mt-4" 
                  onClick={() => setEditingProfile(true)}
                >
                  Edit Profile
                </button>
              </div>
            ) : (
              // Edit Mode
              <form onSubmit={handleProfileUpdate} className="profile-form">
                <div className="input-group">
                  <label>Username</label>
                  <input
                    name="username"
                    value={profileForm.username}
                    onChange={handleProfileChange}
                    placeholder="Enter new username"
                  />
                </div>
                <div className="input-group">
                  <label>Email</label>
                  <input
                    name="email"
                    type="email"
                    value={profileForm.email}
                    onChange={handleProfileChange}
                    placeholder="Enter new email"
                  />
                </div>
                <div className="password-section">
                  <h3>Change Password</h3>
                  <div className="input-group">
                    <label>Current Password</label>
                    <input
                      name="currentPassword"
                      type="password"
                      value={profileForm.currentPassword}
                      onChange={handleProfileChange}
                      placeholder="Enter current password"
                    />
                  </div>
                  <div className="input-group">
                    <label>New Password</label>
                    <input
                      name="newPassword"
                      type="password"
                      value={profileForm.newPassword}
                      onChange={handleProfileChange}
                      placeholder="Enter new password"
                    />
                  </div>
                  <div className="input-group">
                    <label>Confirm New Password</label>
                    <input
                      name="confirmPassword"
                      type="password"
                      value={profileForm.confirmPassword}
                      onChange={handleProfileChange}
                      placeholder="Confirm new password"
                    />
                  </div>
                </div>
                <div className="button-group">
                  <button type="submit" className="action-btn primary-btn">
                    Save Changes
                  </button>
                  <button 
                    type="button" 
                    className="action-btn secondary-btn"
                    onClick={() => {
                      setEditingProfile(false);
                      setProfileForm(prev => ({
                        ...prev,
                        username: userProfile.username,
                        email: userProfile.email,
                        currentPassword: '',
                        newPassword: '',
                        confirmPassword: ''
                      }));
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
        </div>
    </div>
  );

  const renderGeneratorView = () => (
    <main className="generator-container">
      <div className="card">
        <h2>Create Your Story</h2>

        <section className="genre-section">
          <h3>Select Genres</h3>
          <div className="genre-grid">
            {genres.map(g => (
              <button 
                key={g} 
                className={`genre-btn ${selectedGenres.has(g) ? 'selected' : ''}`} 
                onClick={() => toggleGenre(g)}
              >
                {g}
              </button>
            ))}
          </div>
        </section>

        <section className="hints-section">
          <div className="hints-form">
            <div className="input-group">
              <label>Story Title</label>
              <input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g., The Midnight Glitch" />
            </div>
            <div className="input-group">
              <label>Story Hints</label>
              <textarea rows={6} value={hints} onChange={e => setHints(e.target.value)} placeholder="Describe characters, setting, key plot points..." />
            </div>
            <button className="action-btn primary-btn" onClick={handleGenerate} disabled={loading}>
              {loading ? 'GENERATING...' : 'GENERATE STORY'}
            </button>
          </div>
        </section>
      </div>
      
      {story && (
        <section className="card story-output-card">
          <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', gap:'12px'}}>
            <div>
              <h3 style={{margin:0}}>{story.title}</h3>
              <p className="subtle-text-color mb-3" style={{marginTop:'6px'}}>Genres: {story.genres.join(', ')}</p>
            </div>
            <div style={{display:'flex', gap:'10px'}}>
              {!editingStory ? (
                <>
                  <button className="action-btn" onClick={() => openEditStory(story)}>Edit Story</button>
                </>
              ) : (
                <>
                  <button className="action-btn secondary-btn" onClick={cancelEditStory}>Cancel Edit</button>
                </>
              )}
            </div>
          </div>

          {!editingStory ? (
            <div className="story-box whitespace-pre-wrap">{story.content}</div>
          ) : (
            <div style={{display:'flex', flexDirection:'column', gap:'12px'}}>
              <div className="input-group">
                <label>Edit Story Manually</label>
                <textarea rows={12} value={editContent} onChange={e => setEditContent(e.target.value)} />
              </div>

              <div className="input-group">
                <label>Or regenerate from prompts (give instructions/changes)</label>
                <textarea rows={4} value={editPrompts} onChange={e => setEditPrompts(e.target.value)} placeholder="e.g., Make the ending happier and expand the dialogue in chapter 2" />
              </div>

              <div style={{display:'flex', gap:'10px'}}>
                <button className="action-btn primary-btn" onClick={saveEditedStory} disabled={savingStory}>{savingStory ? 'SAVING...' : 'Save Changes'}</button>
                <button className="action-btn" onClick={regenerateEditedStory} disabled={savingStory}>{savingStory ? 'REGENERATING...' : 'Regenerate from Prompts'}</button>
              </div>
            </div>
          )}
        </section>
      )}
    </main>
  );

  const renderHistoryView = () => (
    <main className="history-container">
      <div className="card">
        <h2>Story History ({storiesHistory.length} found)</h2>
        
        {storiesHistory.length === 0 ? (
          <p className="text-center subtle-text-color py-8">You haven't generated any stories yet. Start creating!</p>
        ) : (
          <ul className="story-list mt-4">
            {storiesHistory.map((hStory) => (
              <li 
                key={hStory._id} 
                className="story-item"
                onClick={() => {
                  setStory(hStory);
                  setCurrentView('generator');
                }}
              >
                <div className="story-info">
                  <span className="story-title">{hStory.title}</span>
                  <span className="story-genres">{hStory.genres.join(', ')}</span>
                </div>
                <span className="story-date">{formatDate(hStory.createdAt)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );

  // --- Main Component Render ---
  return (
    <div className="container dashboard-container">
      <header className="main-header">
        <h1 className="logo">TaleForger  </h1>
        
        <nav className="header-nav">
          <button 
            className={`nav-btn action-btn ${currentView === 'generator' ? 'active' : ''}`} 
            onClick={() => setCurrentView('generator')}
          >
            Generator
          </button>
          <button 
            className={`nav-btn action-btn ${currentView === 'history' ? 'active' : ''}`} 
            onClick={() => fetchHistory() && setCurrentView('history')}
          >
            History ({storiesHistory.length})
          </button>
        </nav>

        <div className="user-controls">
          {/* USER PROFILE BUTTON */}
          <button 
            className="action-btn user-profile-btn" 
            onClick={() => setShowUserDetails(true)}
            aria-label={`User Profile: ${userIdDisplay}`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="inline-block mr-1"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            <span className="username-display">{userIdDisplay}</span>
          </button>
          {/* Logout Button (moved to header bar for better layout) */}
          <button id="logout-btn" className="action-btn logout-btn" onClick={onLogout}>
            Logout
          </button>
        </div>
      </header>
      
      {/* Error Message Display (styled with accent colors) */}
      {errorMessage && (
        <div className="error-message card" style={{borderColor: COLORS.ACCENT_2, borderLeft: `5px solid ${COLORS.ACCENT_2}`, background: '#33264d', padding: '15px', marginBottom: '20px'}}>
          <strong style={{color: COLORS.ACCENT_2}}>Error:</strong> {errorMessage}
        </div>
      )}

      {/* Conditional View Rendering */}
      {currentView === 'generator' && renderGeneratorView()}
      {currentView === 'history' && renderHistoryView()}
      
      {/* User Details Modal */}
      {showUserDetails && renderUserDetailsModal()}

      <style jsx global>{`
        /* --- USER-PROVIDED CSS VARIABLES --- */
        :root {
            --bg-color: ${COLORS.BG};
            --card-color: ${COLORS.CARD};
            --accent-color-1: ${COLORS.ACCENT_1}; /* Purple */
            --accent-color-2: ${COLORS.ACCENT_2}; /* Neon Green */
            --text-color: ${COLORS.TEXT};
            --subtle-text-color: ${COLORS.SUBTLE_TEXT};
            --card-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
        }

        /* Ensure predictable sizing so inputs and cards don't overflow their containers */
        html, *, *::before, *::after { box-sizing: border-box; }

        /* --- GLOBAL STYLES --- */
        body {
            font-family: 'Inter', sans-serif;
            background-color: var(--bg-color);
            color: var(--text-color);
            padding: 20px;
            min-height: 100vh;
        }

        .container {
            max-width: 860px; /* slightly narrower for more consistent spacing */
            width: 100%;
            margin: 0 auto;
            padding: 0 12px; /* small horizontal padding to keep children from touching edges */
        }

        /* Make main content sections use a consistent column layout */
        .generator-container, .history-container {
          display: flex;
          flex-direction: column;
          gap: 20px;
          align-items: stretch;
        }

        /* --- LAYOUT & HEADER --- */
        .main-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 2rem;
            padding-bottom: 1.5rem;
            border-bottom: 2px solid var(--card-color);
            gap: 1rem;
        }

        .logo {
            font-size: 2.2rem;
            font-weight: 700;
            color: var(--accent-color-1);
            text-shadow: 0 0 10px var(--accent-color-1);
            letter-spacing: 1px;
            margin: 0;
        }

        .header-nav { display: flex; gap: 12px; align-items: center; }

        .user-controls { display: flex; gap: 10px; align-items: center; }

        /* --- CARD STYLES --- */
        .card, .modal-content {
            background-color: var(--card-color);
            padding: 2rem; /* slightly reduced padding to avoid overflow */
            border-radius: 18px;
            box-shadow: var(--card-shadow);
            margin-bottom: 1.5rem;
            border: 2px solid var(--accent-color-2);
            transition: transform 0.25s ease;
            width: 100%;
        }

        .card:hover { transform: translateY(-4px); }

        h2, h3 {
            color: var(--accent-color-2);
            text-shadow: 0 0 5px var(--accent-color-2);
            margin-bottom: 1rem;
            font-weight: 700;
        }

        .card h2 {
            text-align: center;
            border-bottom: 1px solid var(--card-color);
            padding-bottom: 10px;
        }

        /* --- BUTTONS --- */
        .action-btn { padding: 10px 18px; border: none; border-radius: 50px; font-size: 0.95rem; font-weight: 700; cursor: pointer; text-transform: uppercase; }

        .nav-btn { background: var(--card-color); color: var(--subtle-text-color); border: 1px solid var(--card-color); padding: 9px 14px; }
        .nav-btn.active { background-color: var(--accent-color-1); color: var(--bg-color); box-shadow: 0 0 10px var(--accent-color-1); }
        .nav-btn:hover { transform: translateY(-1px); background-color: #33334d; }

        .primary-btn { background-color: var(--accent-color-2); color: var(--bg-color); width: 100%; }
        .primary-btn:hover:not(:disabled) { transform: translateY(-3px); box-shadow: 0 8px 20px rgba(138, 255, 138, 0.35); }
        .primary-btn:disabled { opacity: 0.5; cursor: not-allowed; }

        .logout-btn { background: transparent; color: var(--accent-color-1); border: 2px solid var(--accent-color-1); padding: 8px 16px; }
        .logout-btn:hover { background-color: var(--accent-color-1); color: var(--bg-color); transform: scale(1.03); }

        .user-profile-btn { 
          background: var(--card-color); 
          color: var(--accent-color-1); 
          border: 2px solid var(--accent-color-1); 
          padding: 8px 16px; 
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .user-profile-btn:hover { 
          background-color: var(--accent-color-1); 
          color: var(--bg-color); 
          transform: scale(1.03); 
        }
        .username-display {
          font-weight: 600;
          max-width: 150px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        /* --- GENRE BUTTONS --- */
        .genre-grid { display: flex; flex-wrap: wrap; gap: 10px; justify-content: flex-start; margin-bottom: 1.25rem; }

        .genre-btn { padding: 10px 18px; border: 2px solid var(--accent-color-1); border-radius: 50px; background: transparent; cursor: pointer; font-size: 0.95rem; color: var(--text-color); text-transform: uppercase; }
        .genre-btn:hover { background-color: var(--accent-color-1); box-shadow: 0 0 12px var(--accent-color-1); transform: translateY(-2px); }
        .genre-btn.selected { background-color: var(--accent-color-2); color: var(--bg-color); border-color: var(--accent-color-2); box-shadow: 0 0 12px var(--accent-color-2); transform: scale(1.03); }

        /* --- FORMS & INPUTS --- */
        .hints-form { width: 100%; max-width: 100%; }
        .input-group { margin-bottom: 1rem; }
        label { display: block; font-weight: 700; margin-bottom: 0.5rem; color: var(--subtle-text-color); }

        input, textarea {
            width: 100%;
            padding: 12px; /* slightly reduced */
            border: 2px solid var(--card-color);
            background-color: #33334d;
            border-radius: 8px;
            font-size: 0.95rem;
            color: var(--text-color);
            transition: border-color 0.25s, box-shadow 0.25s;
            resize: vertical;
        }
        input::placeholder, textarea::placeholder { color: #9b9bb0; }

        input:focus, textarea:focus { outline: none; border-color: var(--accent-color-1); box-shadow: 0 0 8px var(--accent-color-1); }

        /* --- STORY OUTPUT --- */
        .story-output-card { border: 2px solid var(--accent-color-1); }
        .story-box { background-color: #26263b; padding: 1.6rem; border-radius: 12px; white-space: pre-wrap; line-height: 1.7; border-left: 5px solid var(--accent-color-2); max-height: 420px; overflow-y: auto; }

        .subtle-text-color { color: var(--subtle-text-color); }

        /* --- HISTORY LIST --- */
        .story-list { list-style: none; padding: 0; }
        .story-item { display: flex; justify-content: space-between; align-items: center; padding: 12px; margin-bottom: 10px; background-color: #33334d; border-radius: 10px; cursor: pointer; transition: all 0.2s ease; border-left: 5px solid var(--accent-color-1); box-shadow: 0 2px 8px rgba(0, 0, 0, 0.18); }
        .story-item:hover { background-color: #3a3a55; transform: translateY(-1px); border-left-color: var(--accent-color-2); }
        .story-info { display: flex; flex-direction: column; }
        .story-title { font-weight: 600; color: var(--text-color); }
        .story-genres { font-size: 0.88rem; color: var(--subtle-text-color); }
        .story-date { font-size: 0.88rem; color: var(--subtle-text-color); }

        /* --- MODAL STYLES --- */
        .modal-overlay { position: fixed; inset: 0; background: rgba(0, 0, 0, 0.8); display: flex; justify-content: center; align-items: center; z-index: 1000; padding: 20px; }
        .modal-content { 
          padding: 22px; 
          animation: fadeIn 0.25s ease-out; 
          margin: 0; 
          border-color: var(--accent-color-1); 
          max-width: 520px; 
          width: 100%;
          max-height: 90vh;
          overflow-y: auto;
        }
        .modal-content h2 { border-bottom: 2px solid var(--accent-color-1); padding-bottom: 10px; margin-bottom: 16px; }
        
        /* Profile Modal Specific Styles */
        .profile-info .info-group {
          margin-bottom: 16px;
          padding: 12px;
          background: rgba(0,0,0,0.2);
          border-radius: 8px;
        }
        .profile-info .info-group label {
          color: var(--subtle-text-color);
          font-size: 0.9rem;
          margin-bottom: 4px;
        }
        .profile-info .info-group p {
          color: var(--text-color);
          font-size: 1.1rem;
          margin: 0;
        }
        .profile-form {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .password-section {
          margin-top: 20px;
          padding-top: 20px;
          border-top: 1px solid var(--card-color);
        }
        .password-section h3 {
          font-size: 1.1rem;
          margin-bottom: 16px;
          color: var(--accent-color-1);
        }
        .button-group {
          display: flex;
          gap: 12px;
          margin-top: 24px;
        }
        .secondary-btn {
          background: transparent;
          border: 2px solid var(--accent-color-1);
          color: var(--accent-color-1);
        }
        .secondary-btn:hover {
          background: var(--accent-color-1);
          color: var(--bg-color);
        }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }

        /* --- RESPONSIVENESS --- */
        @media (max-width: 768px) {
          .main-header { flex-direction: column; gap: 12px; padding-bottom: 10px; }
          .logo { margin-bottom: 6px; }
          .user-controls { width: 100%; justify-content: center; }
          .action-btn { padding: 9px 12px; font-size: 0.9rem; }
          .nav-btn { font-size: 0.82rem; }
          .card { padding: 1.6rem; }
        }
        @media (max-width: 500px) {
          .card { padding: 1.2rem; }
          .user-controls { flex-direction: column; gap: 8px; }
          .user-profile-btn, .logout-btn { width: 100%; text-align: center; }
          .story-item { flex-direction: column; align-items: flex-start; gap: 6px; }
        }
      `}</style>
    </div>
  );
}
