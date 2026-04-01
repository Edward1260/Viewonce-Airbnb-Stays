'use client';

import React, { useState, useEffect, FormEvent } from 'react';
import { useRouter } from 'next/navigation';

const API_BASE_URL = 'http://localhost:3001/api/v1';

const welcomeMessages = [
  "Welcome Back!",
  "Your Adventure Awaits",
  "Discover Unique Stays",
  "Create Memories",
  "Join Our Community"
];

export default function AuthPage() {
  const router = useRouter();
  const [view, setView] = useState<'login' | 'signup' | 'otp'>('login');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'error' | 'success' | '' }>({ text: '', type: '' });
  const [currentMsgIndex, setCurrentMsgIndex] = useState(0);
  const [waveActive, setWaveActive] = useState(false);

  // Form States
  const [loginData, setLoginData] = useState({ email: '', password: '' });
  const [signupData, setSignupData] = useState({ name: '', email: '', phone: '', role: '', password: '', confirmPassword: '' });
  const [otpValue, setOtpValue] = useState('');

  // Carousel logic
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentMsgIndex((prev) => (prev + 1) % welcomeMessages.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  // Auth check on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('token');
      const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
      if (token && isLoggedIn) {
        try {
          const user = JSON.parse(localStorage.getItem('user') || '{}');
          if (user.role) redirectBasedOnRole(user.role);
        } catch (e) {
          localStorage.clear();
        }
      }
    }
  }, []);

  const triggerWave = () => {
    setWaveActive(true);
    setTimeout(() => setWaveActive(false), 1500);
  };

  const redirectBasedOnRole = (role: string) => {
    switch (role) {
      case 'admin': router.push('/admin-dashboard'); break;
      case 'host': router.push('/host-dashboard'); break;
      default: router.push('/customer-dashboard'); break;
    }
  };

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ text: '', type: '' });

    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginData),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Login failed.');

      localStorage.setItem('token', data.accessToken || data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      localStorage.setItem('isLoggedIn', 'true');

      setMessage({ text: 'Login successful! Redirecting...', type: 'success' });
      triggerWave();
      setTimeout(() => redirectBasedOnRole(data.user.role), 800);
    } catch (err: any) {
      setMessage({ text: err.message, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleSignupRequest = async (e: FormEvent) => {
    e.preventDefault();
    if (signupData.password !== signupData.confirmPassword) {
      setMessage({ text: 'Passwords do not match.', type: 'error' });
      return;
    }

    setLoading(true);
    setMessage({ text: '', type: '' });

    try {
      const response = await fetch(`${API_BASE_URL}/auth/signup/request-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: signupData.name,
          email: signupData.email,
          phone: signupData.phone,
          role: signupData.role,
          password: signupData.password
        }),
      });

      const data = await response.json();
      if (data.otpRequired && data.sessionId) {
        localStorage.setItem('otpSessionId', data.sessionId);
        localStorage.setItem('signupEmailForOtp', signupData.email);
        setView('otp');
        setMessage({ text: 'OTP sent to your email. Please verify.', type: 'success' });
      } else if (!response.ok) {
        throw new Error(data.message || 'Signup failed.');
      }
    } catch (err: any) {
      setMessage({ text: err.message, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleOtpVerify = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const sessionId = localStorage.getItem('otpSessionId');
    const email = localStorage.getItem('signupEmailForOtp');

    try {
      const response = await fetch(`${API_BASE_URL}/auth/signup/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp: otpValue, sessionId })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Verification failed.');

      localStorage.setItem('token', data.accessToken || data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      localStorage.setItem('isLoggedIn', 'true');
      triggerWave();
      setTimeout(() => redirectBasedOnRole(data.user.role), 800);
    } catch (err: any) {
      setMessage({ text: err.message, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page-wrapper">
      {/* Floating Bubbles */}
      <div className="floating-bubbles">
        {[...Array(8)].map((_, i) => <div key={i} className="bubble"></div>)}
      </div>

      <div className="auth-container">
        {/* Left Section */}
        <div className="left-section">
          <img src="/authentication image/auth image.png" alt="Welcome" className="auth-image-bg" />
          <div className="auth-image-overlay"></div>
          <div className="welcome-messages">
            {welcomeMessages.map((msg, idx) => (
              <div key={idx} className={`welcome-message ${currentMsgIndex === idx ? 'active' : ''}`}>
                {msg}
              </div>
            ))}
          </div>
        </div>

        {/* Center Card */}
        <div className="center-section">
          <div className="liquid-card">
            <div className="card-bubble card-bubble-1"></div>
            <div className="card-bubble card-bubble-2"></div>
            <div className={`liquid-wave ${waveActive ? 'active' : ''}`}></div>

            <div className="card-content">
              <h2 className="card-title">
                {view === 'login' ? 'Sign in' : view === 'signup' ? 'Sign up' : 'Verify Email'}
              </h2>

              <div className="form-container">
                {message.text && (
                  <div className={`message ${message.type}`}>{message.text}</div>
                )}

                {view === 'login' && (
                  <form onSubmit={handleLogin} className="active">
                    <div className="form-group">
                      <input 
                        type="email" 
                        placeholder="Email address" 
                        className="form-input" 
                        required 
                        value={loginData.email}
                        onChange={e => setLoginData({...loginData, email: e.target.value})}
                      />
                    </div>
                    <div className="form-group">
                      <input 
                        type="password" 
                        placeholder="Password" 
                        className="form-input" 
                        required 
                        value={loginData.password}
                        onChange={e => setLoginData({...loginData, password: e.target.value})}
                      />
                    </div>
                    <button type="submit" className="login-btn" disabled={loading}>
                      {loading ? 'Signing in...' : 'Sign In'}
                    </button>
                    <p className="switch-text">
                      Don't have an account? <a onClick={() => setView('signup')}>Sign Up</a>
                    </p>
                  </form>
                )}

                {view === 'signup' && (
                  <form onSubmit={handleSignupRequest} className="active">
                    <div className="form-group">
                      <input type="text" placeholder="Full Name" className="form-input" required 
                        onChange={e => setSignupData({...signupData, name: e.target.value})}/>
                    </div>
                    <div className="form-group">
                      <input type="email" placeholder="Email address" className="form-input" required 
                        onChange={e => setSignupData({...signupData, email: e.target.value})}/>
                    </div>
                    <div className="form-group">
                      <select className="form-select" required onChange={e => setSignupData({...signupData, role: e.target.value})}>
                        <option value="">Select Account Type</option>
                        <option value="customer">Customer</option>
                        <option value="host">Host</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <input type="password" placeholder="Password" className="form-input" required 
                        onChange={e => setSignupData({...signupData, password: e.target.value})}/>
                    </div>
                    <div className="form-group">
                      <input type="password" placeholder="Confirm Password" className="form-input" required 
                        onChange={e => setSignupData({...signupData, confirmPassword: e.target.value})}/>
                    </div>
                    <button type="submit" className="login-btn" disabled={loading}>
                      {loading ? 'Creating account...' : 'Create Account'}
                    </button>
                    <p className="switch-text">
                      Already have an account? <a onClick={() => setView('login')}>Sign In</a>
                    </p>
                  </form>
                )}

                {view === 'otp' && (
                  <form onSubmit={handleOtpVerify} className="active">
                    <p className="text-sm text-gray-600 mb-4">Enter the 6-digit code sent to your email.</p>
                    <div className="form-group">
                      <input type="text" maxLength={6} className="form-input" placeholder="000000" required 
                        value={otpValue} onChange={e => setOtpValue(e.target.value)}/>
                    </div>
                    <button type="submit" className="login-btn" disabled={loading}>
                      {loading ? 'Verifying...' : 'Verify OTP'}
                    </button>
                  </form>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .auth-page-wrapper {
          font-family: 'Poppins', sans-serif;
          background-color: #e6e7ee;
          min-height: 100vh;
          display: flex;
          justify-content: center;
          align-items: center;
          overflow-x: hidden;
          position: relative;
        }
        .auth-container {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 100%;
          max-width: 1400px;
          padding: 20px;
          z-index: 10;
        }
        .left-section {
          flex: 1;
          position: relative;
          height: 100vh;
          overflow: hidden;
        }
        .auth-image-bg {
          position: absolute;
          width: 100%;
          height: 100%;
          object-fit: cover;
          filter: blur(2px);
        }
        .auth-image-overlay {
          position: absolute;
          width: 100%;
          height: 100%;
          background: linear-gradient(135deg, rgba(108, 92, 231, 0.4) 0%, rgba(162, 155, 254, 0.2) 100%);
          backdrop-filter: blur(2px);
        }
        .welcome-messages {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 80%;
          text-align: center;
        }
        .welcome-message {
          position: absolute;
          width: 100%;
          opacity: 0;
          transform: translateY(20px);
          font-size: 1.8rem;
          font-weight: 600;
          color: white;
          text-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
          transition: all 0.5s ease;
        }
        .welcome-message.active {
          opacity: 1;
          transform: translateY(0);
          position: relative;
        }
        .liquid-card {
          width: 420px;
          min-height: 500px;
          border-radius: 50px;
          background: #e6e7ee;
          position: relative;
          display: flex;
          justify-content: center;
          align-items: center;
          box-shadow: 20px 20px 60px #c5c6cf, -20px -20px 60px #ffffff;
          overflow: hidden;
          padding: 30px 0;
        }
        .card-content { width: 85%; text-align: center; z-index: 5; }
        .form-input, .form-select {
          width: 100%;
          padding: 14px 20px;
          border: none;
          border-radius: 25px;
          background: #e6e7ee;
          box-shadow: inset 5px 5px 10px #c5c6cf, inset -5px -5px 10px #ffffff;
          margin-bottom: 15px;
          outline: none;
        }
        .login-btn {
          width: 100%;
          padding: 14px;
          border: none;
          border-radius: 25px;
          background: linear-gradient(135deg, #FF6B6B 0%, #D63031 100%);
          color: white;
          font-weight: 600;
          cursor: pointer;
          box-shadow: 0 5px 20px rgba(214, 48, 49, 0.3);
        }
        .message { padding: 10px; border-radius: 8px; margin-bottom: 15px; font-size: 0.9rem; }
        .message.error { background: rgba(214, 48, 49, 0.1); color: #D63031; }
        .message.success { background: rgba(52, 168, 83, 0.1); color: #00B894; }
        .switch-text a { color: #6C5CE7; font-weight: 600; cursor: pointer; }
        
        .floating-bubbles .bubble {
          position: absolute;
          border-radius: 50%;
          opacity: 0.4;
          background: linear-gradient(135deg, #74B9FF, #0984E3);
          animation: rise 10s infinite ease-in;
          bottom: -50px;
        }
        @keyframes rise {
          from { bottom: -50px; transform: translateX(0); }
          to { bottom: 110%; transform: translateX(20px); }
        }
        .liquid-wave {
          position: absolute;
          top: 0; left: -100%; width: 300%; height: 100%;
          background: linear-gradient(90deg, transparent, rgba(108,92,231,0.2), transparent);
          pointer-events: none;
        }
        .liquid-wave.active { animation: waveFlow 1.5s ease-in-out; }
        @keyframes waveFlow {
          0% { left: -100%; }
          100% { left: 100%; }
        }

        @media (max-width: 900px) {
          .auth-container { flex-direction: column; }
          .left-section { width: 100%; height: 200px; }
          .liquid-card { width: 100%; max-width: 360px; border-radius: 25px; }
        }
      `}</style>
    </div>
  );
}