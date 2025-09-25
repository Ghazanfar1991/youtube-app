import React, { createContext, useState, useEffect, ReactNode, useContext } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { UserAccount, EmailUserCredentials } from '../types';
import { ToastContext } from './ToastContext';

declare const google: any;

interface AuthContextType {
    accounts: UserAccount[]; // These will be just google accounts for the settings page
    activeAccount: UserAccount | null;
    login: () => void; // Google login
    emailSignUp: (name: string, email: string, password: string) => Promise<void>;
    emailLogin: (email: string, password: string) => Promise<void>;
    logout: () => void;
    disconnectAccount: (accountId: string) => void;
    switchAccount: (accountId: string) => void;
    useCredits: (amount: number) => void;
    addCredits: (amount: number) => void;
    changePlan: (plan: 'Pro' | 'Max') => void;
}

export const AuthContext = createContext<AuthContextType>({
    accounts: [],
    activeAccount: null,
    login: () => {},
    emailSignUp: async () => {},
    emailLogin: async () => {},
    logout: () => {},
    disconnectAccount: () => {},
    switchAccount: () => {},
    useCredits: () => {},
    addCredits: () => {},
    changePlan: () => {},
});

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || "YOUR_GOOGLE_CLIENT_ID";

const SCOPES = [
    'https://www.googleapis.com/auth/youtube.readonly',
    'https://www.googleapis.com/auth/yt-analytics.readonly',
    'https://www.googleapis.com/auth/youtube.upload',
    'https://www.googleapis.com/auth/userinfo.profile',
    'https://www.googleapis.com/auth/userinfo.email'
].join(' ');

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [users, setUsers] = useLocalStorage<UserAccount[]>('app-users', []);
    const [emailCredentials, setEmailCredentials] = useLocalStorage<EmailUserCredentials[]>('app-email-creds', []);
    const [activeAccountId, setActiveAccountId] = useLocalStorage<string | null>('app-active-user-id', null);
    const [isGisInitialized, setIsGisInitialized] = useState(false);
    const { showToast } = useContext(ToastContext);

    const activeAccount = users.find(acc => acc.id === activeAccountId) || null;

    useEffect(() => {
        const script = document.createElement('script');
        script.src = 'https://accounts.google.com/gsi/client';
        script.async = true;
        script.defer = true;
        script.onload = () => setIsGisInitialized(true);
        document.body.appendChild(script);
    }, []);

    // Effect for plan renewal simulation
    useEffect(() => {
        if (activeAccount && activeAccount.plan !== 'Free' && activeAccount.planRenewalDate && Date.now() > activeAccount.planRenewalDate) {
            console.log("Renewing plan for user:", activeAccount.email);
            const creditsForPlan = activeAccount.plan === 'Pro' ? 750 : 1500;
            const nextRenewal = new Date();
            nextRenewal.setMonth(nextRenewal.getMonth() + 1);
            
            setUsers(prevUsers => prevUsers.map(u =>
                u.id === activeAccount.id ? { ...u, credits: creditsForPlan, planRenewalDate: nextRenewal.getTime() } : u
            ));
            showToast({ message: `Your ${activeAccount.plan} plan has been renewed with ${creditsForPlan} credits!`});
        }
    }, [activeAccount, setUsers, showToast]);


    const handleCredentialResponse = async (tokenResponse: any) => {
        if (tokenResponse.access_token) {
            const profileResponse = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                headers: { 'Authorization': `Bearer ${tokenResponse.access_token}` }
            });
            const profile = await profileResponse.json();

            let finalAccount: UserAccount;
            const existingUser = users.find(a => a.id === profile.sub);

            if (existingUser) {
                // Update existing user's token and picture
                finalAccount = { ...existingUser, accessToken: tokenResponse.access_token, picture: profile.picture };
            } else {
                // Create a new user with a free plan
                finalAccount = {
                    id: profile.sub,
                    name: profile.name,
                    email: profile.email,
                    picture: profile.picture,
                    accessToken: tokenResponse.access_token,
                    provider: 'google',
                    plan: 'Free',
                    credits: 15,
                };
            }

            setUsers(prev => {
                if (existingUser) {
                    return prev.map(a => a.id === finalAccount.id ? finalAccount : a);
                }
                return [...prev, finalAccount];
            });
            setActiveAccountId(finalAccount.id);
        }
    };
    
    const login = () => {
        if (!isGisInitialized) {
            showToast({ message: "Google Sign-In is not ready yet.", variant: 'destructive' });
            return;
        }
        if (!GOOGLE_CLIENT_ID || GOOGLE_CLIENT_ID === "YOUR_GOOGLE_CLIENT_ID") {
            showToast({ message: "Google Client ID is not configured.", variant: 'destructive' });
            return;
        }
        try {
            const tokenClient = google.accounts.oauth2.initTokenClient({
                client_id: GOOGLE_CLIENT_ID,
                scope: SCOPES,
                callback: handleCredentialResponse,
            });
            tokenClient.requestAccessToken();
        } catch (error) {
            console.error("Google Sign-In Error:", error);
            showToast({ message: "Failed to initiate Google Sign-In.", variant: 'destructive' });
        }
    };

    const emailSignUp = (name: string, email: string, password: string): Promise<void> => {
        return new Promise((resolve, reject) => {
            if (emailCredentials.some(u => u.email.toLowerCase() === email.toLowerCase())) {
                reject(new Error("An account with this email already exists."));
                return;
            }

            const newUserId = `email-${Date.now()}-${Math.random()}`;
            const newCred: EmailUserCredentials = { id: newUserId, email, password_hash: password };
            setEmailCredentials(prev => [...prev, newCred]);

            const newAccount: UserAccount = { 
                id: newUserId, 
                name, 
                email, 
                provider: 'email',
                plan: 'Free',
                credits: 15,
            };
            setUsers(prev => [...prev, newAccount]);
            
            setActiveAccountId(newUserId);
            resolve();
        });
    };

    const emailLogin = (email: string, password: string): Promise<void> => {
        return new Promise((resolve, reject) => {
            const userCred = emailCredentials.find(u => u.email.toLowerCase() === email.toLowerCase());
            if (!userCred || userCred.password_hash !== password) {
                reject(new Error("Invalid email or password."));
                return;
            }
            setActiveAccountId(userCred.id);
            resolve();
        });
    };

    const useCredits = (amount: number) => {
        if (!activeAccount) {
            throw new Error("You must be logged in to perform this action.");
        }
        if (activeAccount.credits < amount) {
            throw new Error("Insufficient credits.");
        }
        setUsers(prev => prev.map(u => 
            u.id === activeAccount.id ? { ...u, credits: u.credits - amount } : u
        ));
    };

    const addCredits = (amount: number) => {
        if (!activeAccount) return;
        setUsers(prev => prev.map(u => 
            u.id === activeAccount.id ? { ...u, credits: u.credits + amount } : u
        ));
    };

    const changePlan = (plan: 'Pro' | 'Max') => {
        if (!activeAccount) return;

        const creditsForPlan = plan === 'Pro' ? 750 : 1500;
        const nextRenewal = new Date();
        nextRenewal.setMonth(nextRenewal.getMonth() + 1);

        setUsers(prev => prev.map(u => 
            u.id === activeAccount.id 
                ? { ...u, plan, credits: creditsForPlan, planRenewalDate: nextRenewal.getTime() } 
                : u
        ));
        showToast({ message: `Successfully upgraded to ${plan} plan!` });
    };

    const disconnectAccount = (accountId: string) => {
        setUsers(prev => prev.filter(acc => acc.id !== accountId));
        setEmailCredentials(prev => prev.filter(cred => cred.id !== accountId));
        if (activeAccountId === accountId) {
            const remainingGoogleAccounts = users.filter(acc => acc.id !== accountId && acc.provider === 'google');
            setActiveAccountId(remainingGoogleAccounts.length > 0 ? remainingGoogleAccounts[0].id : null);
        }
    };

    const logout = () => {
        setActiveAccountId(null);
    };

    const switchAccount = (accountId: string) => {
        if (users.find(u => u.id === accountId && u.provider === 'google')) {
           setActiveAccountId(accountId);
        }
    };
    
    return (
        <AuthContext.Provider value={{ 
            accounts: users.filter(u => u.provider === 'google'), 
            activeAccount, 
            login, 
            emailSignUp,
            emailLogin,
            logout, 
            disconnectAccount, 
            switchAccount,
            useCredits,
            addCredits,
            changePlan,
        }}>
            {children}
        </AuthContext.Provider>
    );
};
