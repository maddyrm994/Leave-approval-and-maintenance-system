import React, { useState, useCallback } from 'react';
import type { User } from './types';
import { getUser, loginUser } from './services/api';
import Dashboard from './components/Dashboard';
import Header from './components/Header';
import LoginPage from './components/LoginPage';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  const handleLogin = useCallback(async (email: string, password: string) => {
    setIsLoading(true);
    setLoginError(null);
    try {
      const user = await loginUser(email, password);
      if (user) {
        setCurrentUser(user);
      } else {
        setLoginError('Invalid email or password.');
      }
    } catch (error) {
      console.error("Login failed:", error);
      setLoginError('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleLogout = useCallback(() => {
    setCurrentUser(null);
    setLoginError(null);
  }, []);

  const handleDataChange = useCallback(async () => {
      if(currentUser) {
          const user = await getUser(currentUser.id);
          if (user) {
            setCurrentUser(user);
          } else {
            // If the user somehow doesn't exist anymore, log them out.
            setCurrentUser(null);
          }
      }
  }, [currentUser]);


  if (!currentUser) {
    return <LoginPage onLogin={handleLogin} isLoading={isLoading} error={loginError} />;
  }

  return (
    <div className="flex h-screen bg-slate-100 text-slate-800">
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header currentUser={currentUser} onLogout={handleLogout} />
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-slate-100 p-6 md:p-8">
          <Dashboard currentUser={currentUser} key={currentUser.id} onDataChange={handleDataChange} />
        </main>
      </div>
    </div>
  );
};

export default App;
