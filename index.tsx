import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { Auth } from './components/Auth';
import { auth } from './firebase';
import { signOut, sendEmailVerification, User } from 'firebase/auth';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const RootComponent = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading,setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setUser(user);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleLogout = () => {
    signOut(auth);
  };

  const handleResendVerification = () => {
    if (user && !user.emailVerified) {
        sendEmailVerification(user)
            .then(() => alert("Verification email sent! Please check your inbox (and spam folder)."))
            .catch((error: any) => alert(`Error sending verification email: ${error.message}`));
    }
  };

  if (loading) {
    return (
      <div className="w-screen h-screen flex items-center justify-center bg-gray-100">
        <div className="text-xl font-semibold">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return <Auth />;
  }

  if (!user.emailVerified) {
    return (
      <div className="w-screen h-screen flex flex-col items-center justify-center bg-gray-100 p-4 text-center">
        <div className="max-w-md bg-white p-8 rounded-lg shadow-md">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-16 h-16 mx-auto mb-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            <h1 className="text-2xl font-bold mb-4 text-gray-800">Verify Your Email</h1>
            <p className="mb-2 text-gray-600">A verification link has been sent to</p>
            <p className="mb-6 font-semibold text-gray-800">{user.email}</p>
            <p className="mb-6 text-sm text-gray-500">Please check your inbox and click the link to continue. You may need to refresh this page after verifying.</p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <button onClick={handleResendVerification} className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors">
                    Resend Email
                </button>
                <button onClick={handleLogout} className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors">
                    Sign Out
                </button>
            </div>
        </div>
      </div>
    );
  }

  return <App />;
};


const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <RootComponent />
  </React.StrictMode>
);