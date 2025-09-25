import React, { useContext, useEffect, useState } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import { Page } from '../App';
import { ThumbGeniusLogo, GoogleIcon } from '../components/icons';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { ToastContext } from '../contexts/ToastContext';

interface LoginPageProps {
    onNavigate: (page: Page) => void;
}

const LoginPage: React.FC<LoginPageProps> = ({ onNavigate }) => {
    const { login, emailLogin, activeAccount } = useContext(AuthContext);
    const { showToast } = useContext(ToastContext);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (activeAccount) {
            onNavigate('generator');
        }
    }, [activeAccount, onNavigate]);

    const handleEmailLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            await emailLogin(email, password);
            // The useEffect will handle navigation
        } catch (error) {
            showToast({ message: error instanceof Error ? error.message : 'Login failed', variant: 'destructive' });
            setIsLoading(false);
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen -mt-16 bg-background-light dark:bg-background-dark">
            <div className="w-full max-w-md p-8 space-y-6 bg-white dark:bg-gray-900/50 border border-black/10 dark:border-white/10 rounded-2xl shadow-lg">
                <div className="text-center">
                     <div className="flex items-center justify-center gap-2 mb-4">
                           <div className="text-primary size-9">
                                <ThumbGeniusLogo />
                           </div>
                           <span className="font-bold text-3xl text-gray-900 dark:text-white">ThumbGenius</span>
                        </div>
                    <h2 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">Log in to your account</h2>
                    <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                        Don't have an account?{' '}
                        <button onClick={() => onNavigate('signup')} className="font-medium text-primary hover:text-primary/90">
                            Sign up
                        </button>
                    </p>
                </div>

                <form onSubmit={handleEmailLogin} className="space-y-4">
                    <div>
                        <label htmlFor="email" className="sr-only">Email address</label>
                        <Input 
                            id="email" 
                            name="email" 
                            type="email" 
                            autoComplete="email" 
                            required 
                            placeholder="Email address"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />
                    </div>
                    <div>
                        <label htmlFor="password" className="sr-only">Password</label>
                        <Input 
                            id="password" 
                            name="password" 
                            type="password" 
                            autoComplete="current-password" 
                            required 
                            placeholder="Password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                    </div>
                    <Button type="submit" className="w-full bg-primary text-white hover:bg-primary/90" disabled={isLoading}>
                        {isLoading ? 'Signing in...' : 'Sign in'}
                    </Button>
                </form>

                <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-gray-300 dark:border-gray-700" />
                    </div>
                    <div className="relative flex justify-center text-sm">
                        <span className="bg-white dark:bg-gray-900/50 px-2 text-gray-500 dark:text-gray-400">OR</span>
                    </div>
                </div>

                <button
                    onClick={login}
                    className="w-full inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 h-11 px-8 bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-700"
                >
                    <GoogleIcon className="w-5 h-5" />
                    <span className="ml-3">Sign in with Google</span>
                </button>
            </div>
        </div>
    );
};

export default LoginPage;