import React, { createContext, useContext, useEffect, useState } from 'react';
import type { User } from 'firebase/auth';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase';

interface AuthContextType {
  user: User | null;
  role: 'admin' | 'navigator' | 'coordinator' | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({ user: null, role: null, loading: true });

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<'admin' | 'navigator' | 'coordinator' | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        setUser(null);
        setRole(null);
        setLoading(false);
        return;
      }
      
      setUser(currentUser);
      
      try {
        // Check Admin first
        const adminDoc = await getDoc(doc(db, 'admins', currentUser.uid));
        if (adminDoc.exists() && adminDoc.data().isAdmin !== false) {
          setRole('admin');
          setLoading(false);
          return;
        }

        // Check standard Users collection
        const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          if (userData.role === 'navigator') {
            setRole('navigator');
            setLoading(false);
            return;
          }
          if (userData.role === 'coordinator') {
            setRole('coordinator');
            setLoading(false);
            return;
          }
        }
      } catch (error) {
        console.error("Error fetching user role:", error);
      }
      
      // No valid role found
      setRole(null);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  return (
    <AuthContext.Provider value={{ user, role, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
