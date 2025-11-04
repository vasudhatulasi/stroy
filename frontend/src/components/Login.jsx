import React, { useState } from 'react';
import api from './api';

export default function Login({ onRegisterClick, onLogin }) {
  const [emailOrUsername, setEmailOrUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
        console.log('Attempting login...', { emailOrUsername, password: '***' });
        console.log('API base URL:', api.defaults.baseURL);
        const res = await api.post('/login', { identifier: emailOrUsername, password });
        console.log('Login response:', res);
        console.log('Response data:', res.data);
        onLogin(res.data.token);
    } catch (err) {
        console.error('Login error:', err);
        console.error('Error response:', err.response);
        console.error('Error message:', err.message);
        console.error('Error config:', err.config);
        alert(err.response?.data?.msg || `Login failed: ${err.message}`);
    }
  };

  return (
    <div id="login-page">
      <h1 className="logo">TaleForger</h1>
      <div className="card login-card">
        <h2>Login to Your Account</h2>
        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <label>Username or Email</label>
            <input value={emailOrUsername} onChange={e => setEmailOrUsername(e.target.value)} placeholder="Enter your username or email" required />
          </div>
          <div className="input-group">
            <label>Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Enter your password" required />
          </div>
          <button className="action-btn primary-btn login-btn" type="submit">Login</button>
        </form>
        <p className="signup-link">Don't have an account? <a onClick={onRegisterClick} style={{cursor:'pointer'}}>Sign Up</a></p>
      </div>
    </div>
  );
}

// Add consistent global styling so login/register match the Dashboard look
// (variables duplicated intentionally so these pages work when Dashboard isn't mounted)
const loginStyles = `
  :root{ --bg-color: #1a1a2e; --card-color: #2b2b40; --accent-color-1: #b860ff; --accent-color-2: #8aff8a; --text-color: #f0f0f0; --subtle-text-color: #ccc; }
  html, *, *::before, *::after { box-sizing: border-box; }
  body { background: var(--bg-color); color: var(--text-color); font-family: 'Inter', sans-serif; }
  #login-page { display:flex; flex-direction:column; align-items:center; justify-content:center; min-height:80vh; padding:20px; }
  .logo { font-size:2.2rem; color:var(--accent-color-1); margin-bottom:8px; }
  .card.login-card { width:100%; max-width:420px; padding:1.8rem; border-radius:14px; border:2px solid var(--accent-color-2); }
  h2{ color:var(--accent-color-2); margin-bottom:12px; text-align:center }
  .input-group{ margin-bottom:12px }
  label{ display:block; margin-bottom:6px; color:var(--subtle-text-color); font-weight:700 }
  input{ width:100%; padding:12px; border-radius:8px; border:2px solid var(--card-color); background:#33334d; color:var(--text-color); font-size:0.95rem }
  input:focus{ outline:none; border-color:var(--accent-color-1); box-shadow:0 0 8px var(--accent-color-1) }
  .action-btn{ padding:10px 16px; border-radius:50px; font-weight:700; text-transform:uppercase }
  .primary-btn{ background:var(--accent-color-2); color:var(--bg-color); width:100% }
  .signup-link{ margin-top:12px; color:var(--subtle-text-color); text-align:center }
  .signup-link a{ color:var(--accent-color-1); text-decoration:underline }
  @media (max-width:500px){ .card.login-card{ padding:1.2rem } }
`;

// Inject the styles into the document when this module is loaded (safe for SPA/dynamic mount)
if (typeof document !== 'undefined'){
  const styleTag = document.createElement('style');
  styleTag.setAttribute('data-from','login-styles');
  styleTag.innerHTML = loginStyles;
  document.head.appendChild(styleTag);
}
