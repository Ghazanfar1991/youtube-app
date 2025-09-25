import React, { useState, useContext, useEffect, useRef } from "react";
import ContentModule from "./features/ContentModule";
import PricingPage from "./features/PricingPage";
import HomePage from "./features/HomePage";
import PrivacyPolicyPage from "./features/PrivacyPolicyPage";
import TermsOfServicePage from "./features/TermsOfServicePage";
import LoginPage from "./features/LoginPage";
import SignUpPage from "./features/SignUpPage";
import AccountSettingsPage from "./features/AccountSettingsPage";
import Dashboard from "./features/Dashboard";
import ExtractorModule from "./features/ExtractorModule";
import FaceEditorModule from "./features/FaceEditorModule";
import HistoryPage from "./features/HistoryPage";

import { ToastProvider } from "./contexts/ToastContext";
import { ThumbGeniusLogo, History as HistoryIcon } from "./components/icons";
import { ThumbnailProvider, ThumbnailContext } from "./contexts/ThumbnailContext";
import { AuthProvider, AuthContext } from "./contexts/AuthContext";
import { ThemeProvider, useTheme } from "./contexts/ThemeContext";
import { HistoryProvider } from "./contexts/HistoryContext";

export type Page = 'home' | 'dashboard' | 'generator' | 'extractor' | 'pricing' | 'privacy' | 'terms' | 'login' | 'signup' | 'settings' | 'content' | 'tools' | 'analytics' | 'team' | 'face-editor' | 'history'| 'downloader';

const NavLink: React.FC<{
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}> = ({ active, onClick, children }) => (
  <a
    href="#"
    onClick={(e) => {
      e.preventDefault();
      onClick();
    }}
    className={`text-sm font-medium transition-colors ${
      active
        ? "text-primary dark:text-primary-400"
        : "text-gray-600 dark:text-gray-300 hover:text-primary dark:hover:text-primary-400"
    }`}
  >
    {children}
  </a>
);

function ThemeToggleButton() {
    const { theme, toggleTheme } = useTheme();

    return (
        <button
            onClick={toggleTheme}
            className="relative flex items-center justify-center size-10 rounded-full text-gray-500 dark:text-gray-400 hover:text-primary hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
            aria-label="Toggle theme"
        >
            <span className={`material-symbols-outlined transition-all duration-300 transform ${theme === 'light' ? 'rotate-0 scale-100' : 'rotate-90 scale-0'}`}>light_mode</span>
            <span className={`material-symbols-outlined absolute transition-all duration-300 transform ${theme === 'dark' ? 'rotate-0 scale-100' : '-rotate-90 scale-0'}`}>dark_mode</span>
        </button>
    );
}

const PublicApp: React.FC = () => {
  const [page, setPage] = useState<Page>('home');
  const { setInitialPrompt, setInitialUrl } = useContext(ThumbnailContext);
  
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [page]);

  const handleNavigateToGenerator = (prompt: string) => {
    setInitialPrompt(prompt);
    setPage('login'); // User must log in to generate
  };

  const handleNavigateToExtractor = (url: string) => {
    setInitialUrl(url);
    setPage('login'); // User must log in to extract
  };

  const renderPage = () => {
    switch (page) {
        case 'home':
            return <HomePage onGenerate={handleNavigateToGenerator} onExtract={handleNavigateToExtractor} onNavigate={setPage} />;
        case 'pricing':
            return <PricingPage onNavigate={setPage} />;
        case 'privacy':
            return <PrivacyPolicyPage />;
        case 'terms':
            return <TermsOfServicePage />;
        case 'login':
            return <LoginPage onNavigate={setPage} />;
        case 'signup':
            return <SignUpPage onNavigate={setPage} />;
            
        default:
            return <HomePage onGenerate={handleNavigateToGenerator} onExtract={handleNavigateToExtractor} onNavigate={setPage} />;
    }
  }

  return (
    <div className="flex flex-col min-h-screen">
      <header className="sticky top-0 z-50 bg-background-light/80 dark:bg-background-dark/80 backdrop-blur-lg border-b border-black/10 dark:border-white/10">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <a href="#" onClick={(e) => { e.preventDefault(); setPage('home')}} className="flex items-center gap-4">
                <div className="text-primary size-7">
                  <ThumbGeniusLogo />
                </div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                  ThumbGenius
                </h1>
              </a>
            </div>
            <nav className="hidden md:flex items-center gap-6">
               <NavLink active={page === 'home'} onClick={() => setPage('home')}>
                  Home
               </NavLink>
               <NavLink active={page === 'pricing'} onClick={() => setPage('pricing')}>
                  Pricing
               </NavLink>
            </nav>
            <div className="flex items-center gap-2">
              <ThemeToggleButton />
              <div className="hidden md:flex items-center gap-2">
                <button onClick={() => setPage('login')} className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-primary transition-colors">
                  Log In
                </button>
                <button onClick={() => setPage('signup')} className="px-4 py-2 text-sm font-medium bg-primary text-white rounded-md hover:bg-primary/90 transition-colors">
                  Sign Up
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>
      <main className="flex-grow">
        <div className={['home', 'login', 'signup'].includes(page) ? "" : "container mx-auto px-4 sm:px-6 lg:px-8 py-8"}>
          {renderPage()}
        </div>
      </main>
    </div>
  )
}

const LoggedInApp: React.FC = () => {
    const [page, setPage] = useState<Page>('dashboard');
    const { activeAccount, logout } = useContext(AuthContext);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
        if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
            setIsDropdownOpen(false);
        }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
        document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [dropdownRef]);

    useEffect(() => {
        window.scrollTo(0, 0);
    }, [page]);
    
    const renderPage = () => {
        switch (page) {
            case 'dashboard':
                return <Dashboard onNavigate={setPage} />;
            case 'generator':
                return <ContentModule />;
            case 'face-editor':
                return <FaceEditorModule onNavigate={setPage} />;
            case 'extractor':
                return <ExtractorModule onNavigate={setPage} />;
                          case 'history':
                return <HistoryPage onNavigate={setPage} />;
            case 'settings':
                return <AccountSettingsPage onNavigate={setPage} />;
            case 'pricing':
                return <PricingPage onNavigate={setPage} />;
            default:
                return <Dashboard onNavigate={setPage} />;
        }
    }

    return (
        <div className="flex flex-col min-h-screen">
             <header className="sticky top-0 z-50 bg-background-light/80 dark:bg-background-dark/80 backdrop-blur-lg border-b border-black/10 dark:border-white/10">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        <div className="flex items-center gap-4">
                            <a href="#" onClick={(e) => { e.preventDefault(); setPage('dashboard')}} className="flex items-center gap-4">
                                <div className="text-primary size-7"><ThumbGeniusLogo /></div>
                                <h1 className="text-xl font-bold text-gray-900 dark:text-white">ThumbGenius</h1>
                            </a>
                        </div>
                        <nav className="hidden md:flex items-center gap-6">
                            <NavLink active={page === 'dashboard'} onClick={() => setPage('dashboard')}>Dashboard</NavLink>
                            <NavLink active={page === 'generator'} onClick={() => setPage('generator')}>Generate</NavLink>
                            <NavLink active={page === 'face-editor'} onClick={() => setPage('face-editor')}>Face Editor</NavLink>
                            <NavLink active={page === 'extractor'} onClick={() => setPage('extractor')}>Extractor</NavLink>
                            <NavLink active={page === 'history'} onClick={() => setPage('history')}>History</NavLink>
                        </nav>
                        <div className="flex items-center gap-2">
                            <ThemeToggleButton />
                            <div ref={dropdownRef} className="relative">
                                <button onClick={() => setIsDropdownOpen(!isDropdownOpen)} className="flex items-center gap-2 p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/10">
                                    <div className="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold">
                                        {activeAccount?.picture ? <img src={activeAccount.picture} alt="User" className="w-full h-full rounded-full" /> : activeAccount?.name.charAt(0)}
                                    </div>
                                    <div className="hidden sm:block text-left">
                                        <p className="text-sm font-semibold">{activeAccount?.name}</p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">Credits: {activeAccount?.credits}</p>
                                    </div>
                                </button>
                                {isDropdownOpen && (
                                    <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-md shadow-lg py-1 z-20">
                                        <a href="#" onClick={(e) => { e.preventDefault(); setPage('settings'); setIsDropdownOpen(false); }} className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">Settings</a>
                                        <a href="#" onClick={(e) => { e.preventDefault(); logout(); }} className="block px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700">Logout</a>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </header>
             <main className="flex-grow">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    {renderPage()}
                </div>
            </main>
        </div>
    );
};


function AppContent() {
  const { activeAccount } = useContext(AuthContext);

  if (activeAccount) {
    return <LoggedInApp />;
  }
  
  return <PublicApp />;
}

export default function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <AuthProvider>
          <ThumbnailProvider>
            <HistoryProvider>
              <AppContent />
            </HistoryProvider>
          </ThumbnailProvider>
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}
