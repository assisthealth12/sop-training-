import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../config/firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';

const Login: React.FC = () => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      if (isRegistering) {
        // Handle Registration
        // Verify preapproval first
        const preapprovedDoc = await getDoc(doc(db, 'preapprovedEmails', email));
        if (!preapprovedDoc.exists()) {
          throw new Error('This email is not pre-approved for registration. Please contact an administrator.');
        }

        const role = preapprovedDoc.data().role;
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // Save user to Firestore
        await setDoc(doc(db, 'users', user.uid), {
          id: user.uid,
          name: name,
          email: email,
          role: role,
          createdAt: new Date().toISOString()
        });
        
        // Navigate based on role
        if (role === 'navigator') navigate('/navigator-dashboard');
        else if (role === 'coordinator') navigate('/coordinator-dashboard');
        else navigate('/admin-dashboard');

      } else {
        // Handle Login
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // Check Admin
        const adminDoc = await getDoc(doc(db, 'admins', user.uid));
        if (adminDoc.exists() && adminDoc.data().isAdmin !== false) {
          navigate('/admin-dashboard');
          return;
        }

        // Check standard Users
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          if (userData.role === 'navigator') {
            navigate('/navigator-dashboard');
            return;
          }
          if (userData.role === 'coordinator') {
            navigate('/coordinator-dashboard');
            return;
          }
        }

        throw new Error('Access denied. Unrecognized role.');
      }
    } catch (err: any) {
      if (err.message === 'Access denied. Unrecognized role.') {
        auth.signOut();
      }
      setError(err.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container" style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-body)' }}>
      <div className="login-card card" style={{ width: '100%', maxWidth: '400px', padding: '40px' }}>
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <img src="/assets/images/AH1.png" alt="AssistHealth Logo" style={{ maxWidth: '200px', marginBottom: '15px' }} />
          <p style={{ color: 'var(--text-muted)' }}>{isRegistering ? 'Create your account' : 'Login to access your training materials'}</p>
        </div>

        {error && <div className="alert alert-danger" style={{ background: 'var(--danger-light)', color: 'var(--danger)', padding: '10px', borderRadius: '4px', marginBottom: '20px' }}>{error}</div>}

        <form onSubmit={handleAuth}>
          {isRegistering && (
            <div className="form-group" style={{ marginBottom: '15px' }}>
              <label>Full Name</label>
              <input 
                type="text" 
                required 
                value={name}
                onChange={e => setName(e.target.value)}
              />
            </div>
          )}
          <div className="form-group" style={{ marginBottom: '15px' }}>
            <label>Email Address</label>
            <input 
              type="email" 
              required 
              value={email}
              onChange={e => setEmail(e.target.value)}
            />
          </div>
          <div className="form-group" style={{ marginBottom: '25px', position: 'relative' }}>
            <label>Password</label>
            <input 
              type={showPassword ? 'text' : 'password'} 
              required 
              style={{ paddingRight: '40px' }}
              value={password}
              onChange={e => setPassword(e.target.value)}
              minLength={6}
            />
            <button 
              type="button" 
              onClick={() => setShowPassword(!showPassword)}
              style={{ position: 'absolute', right: '12px', top: '34px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
            >
              <i className={showPassword ? "fas fa-eye-slash" : "fas fa-eye"}></i>
            </button>
          </div>
          <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: '100%', padding: '12px', marginTop: '10px', justifyContent: 'center' }}>
            {loading ? 'Processing...' : (isRegistering ? 'Register' : 'Sign In')}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '20px' }}>
          <button 
            type="button"
            onClick={() => { setIsRegistering(!isRegistering); setError(''); }}
            style={{ background: 'none', border: 'none', color: 'var(--info)', cursor: 'pointer', textDecoration: 'underline' }}
          >
            {isRegistering ? 'Already have an account? Login' : "Don't have an account? Register"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Login;
