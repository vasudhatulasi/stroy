import React, { useState } from 'react';
import api from '../api';

export default function Register({ onLoginClick }) {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirm) return alert('Passwords do not match');
    try {
      const res = await api.post('/register', { username, email, password });
      alert('Registration successful — you are now logged in');
      localStorage.setItem('taleforge_token', res.data.token);
      window.location.reload();
    } catch (err) {
      alert(err.response?.data?.msg || 'Registration failed');
    }
  };

  return (
    <div className="register-container">
      <h1 className="logo">TaleForger</h1>
      <div className="register-card card">
        <h2>Create Your Account</h2>
        <form onSubmit={handleSubmit}>
          <div className="input-group"><label>Username</label><input value={username} onChange={e=>setUsername(e.target.value)} required/></div>
          <div className="input-group"><label>Email Address</label><input value={email} onChange={e=>setEmail(e.target.value)} required/></div>
          <div className="input-group"><label>Password</label><input type="password" value={password} onChange={e=>setPassword(e.target.value)} required/></div>
          <div className="input-group"><label>Confirm Password</label><input type="password" value={confirm} onChange={e=>setConfirm(e.target.value)} required/></div>
          <button className="action-btn primary-btn" type="submit">Register</button>
        </form>
        <p className="login-link">Already have an account? <a onClick={onLoginClick} style={{cursor:'pointer'}}>Login</a></p>
      </div>
    </div>
  );
}

// Consistent global styles for register page (duplicated variables so it works standalone)
const registerStyles = `
  :root{ --bg-color: #1a1a2e; --card-color: #2b2b40; --accent-color-1: #b860ff; --accent-color-2: #8aff8a; --text-color: #f0f0f0; --subtle-text-color: #ccc; }
  html, *, *::before, *::after { box-sizing: border-box; }
  body { background: var(--bg-color); color: var(--text-color); font-family: 'Inter', sans-serif; }
  .register-container{ display:flex; flex-direction:column; align-items:center; justify-content:center; min-height:80vh; padding:20px }
  .logo{ font-size:2.2rem; color:var(--accent-color-1); margin-bottom:8px }
  .register-card.card{ width:100%; max-width:520px; padding:1.8rem; border-radius:14px; border:2px solid var(--accent-color-2) }
  h2{ color:var(--accent-color-2); margin-bottom:12px; text-align:center }
  .input-group{ margin-bottom:12px }
  label{ display:block; margin-bottom:6px; color:var(--subtle-text-color); font-weight:700 }
  input{ width:100%; padding:12px; border-radius:8px; border:2px solid var(--card-color); background:#33334d; color:var(--text-color); font-size:0.95rem }
  input:focus{ outline:none; border-color:var(--accent-color-1); box-shadow:0 0 8px var(--accent-color-1) }
  .action-btn{ padding:10px 16px; border-radius:50px; font-weight:700; text-transform:uppercase }
  .primary-btn{ background:var(--accent-color-2); color:var(--bg-color); width:100% }
  .login-link{ margin-top:12px; color:var(--subtle-text-color); text-align:center }
  .login-link a{ color:var(--accent-color-1); text-decoration:underline }
  @media (max-width:500px){ .register-card.card{ padding:1.2rem } }
`;

if (typeof document !== 'undefined'){
  const styleTag = document.createElement('style');
  styleTag.setAttribute('data-from','register-styles');
  styleTag.innerHTML = registerStyles;
  document.head.appendChild(styleTag);
}
