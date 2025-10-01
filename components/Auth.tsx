import React, { useState } from 'react';
import { auth, googleProvider } from '../firebase';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  sendEmailVerification, 
  signInWithPopup,
} from 'firebase/auth';

const getFriendlyErrorMessage = (errorCode: string): string => {
  switch (errorCode) {
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'Invalid email or password. Please try again.';
    case 'auth/email-already-in-use':
      return 'An account with this email address already exists.';
    case 'auth/weak-password':
      return 'The password is too weak. It must be at least 6 characters long.';
    case 'auth/invalid-email':
      return 'Please enter a valid email address.';
    case 'auth/unauthorized-domain':
        return 'This domain is not authorized for authentication. The project owner needs to add it to the Firebase console.';
    case 'auth/popup-closed-by-user':
        return 'Sign-in cancelled. Please try again.';
    default:
      return 'An unexpected error occurred. Please try again.';
  }
};

export const Auth: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const handleEmailPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);

    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
        // Auth state change will handle redirect
      } else {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        if (userCredential.user) {
            await sendEmailVerification(userCredential.user);
            setMessage('Verification email sent! Please check your inbox.');
        }
        // User will see the verification message on the main screen after auth state changes
      }
    } catch (err: any) {
      setError(getFriendlyErrorMessage(err.code));
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setMessage(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err: any) {
      setError(getFriendlyErrorMessage(err.code));
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col justify-center items-center p-4">
        <div className="w-full max-w-md bg-white rounded-lg shadow-md p-8">
            <h1 className="text-3xl font-bold text-center mb-2 text-gray-800" style={{ fontFamily: "'Patrick Hand', cursive" }}>
                Infinite Corkboard
            </h1>
            <h2 className="text-xl font-semibold text-center mb-6 text-gray-700">
                {isLogin ? 'Welcome Back!' : 'Create an Account'}
            </h2>
            <form onSubmit={handleEmailPasswordSubmit}>
                <div className="mb-4">
                    <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="email">
                        Email Address
                    </label>
                    <input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@example.com"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                    />
                </div>
                <div className="mb-6">
                    <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="password">
                        Password
                    </label>
                    <input
                        id="password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                        minLength={6}
                    />
                </div>
                {error && <p className="text-red-500 text-sm mb-4 text-center">{error}</p>}
                {message && <p className="text-green-500 text-sm mb-4 text-center">{message}</p>}
                <button type="submit" className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-md transition duration-300">
                    {isLogin ? 'Login' : 'Sign Up'}
                </button>
            </form>
            <div className="my-4 flex items-center">
                <div className="flex-grow border-t border-gray-300"></div>
                <span className="flex-shrink mx-4 text-gray-400">or</span>
                <div className="flex-grow border-t border-gray-300"></div>
            </div>
            <button onClick={handleGoogleSignIn} className="w-full bg-white hover:bg-gray-50 border border-gray-300 text-gray-700 font-bold py-2 px-4 rounded-md transition duration-300 flex items-center justify-center">
                <svg className="w-5 h-5 mr-2" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path><path fill="none" d="M0 0h48v48H0z"></path></svg>
                Continue with Google
            </button>
            <p className="mt-6 text-center text-sm text-gray-600">
                {isLogin ? "Don't have an account?" : 'Already have an account?'}
                <button onClick={() => setIsLogin(!isLogin)} className="font-medium text-blue-500 hover:text-blue-600 ml-1">
                    {isLogin ? 'Sign Up' : 'Login'}
                </button>
            </p>
        </div>
    </div>
  );
};