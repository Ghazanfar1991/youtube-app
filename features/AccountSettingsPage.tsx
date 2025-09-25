import React, { useContext } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import { Page } from '../App';
import { Button } from '../components/ui/Button';
import { ToastContext } from '../contexts/ToastContext';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';


interface AccountSettingsPageProps {
    onNavigate: (page: Page) => void;
}

const GoogleAccountsManager: React.FC = () => {
    const { accounts, login, disconnectAccount, activeAccount } = useContext(AuthContext);

    return (
        <Card>
            <CardHeader>
              <CardTitle>Connected Google Accounts</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                {accounts.length > 0 ? (
                    <div className="space-y-3">
                        {accounts.map(account => (
                            <div key={account.id} className="flex items-center justify-between p-3 rounded-xl border border-gray-200 dark:border-gray-700">
                                <div className="flex items-center gap-3">
                                     <div className="w-10 h-10 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold">
                                        {account.picture ? <img src={account.picture} alt={account.name} className="w-full h-full rounded-full object-cover" /> : account.name.slice(0, 1).toUpperCase()}
                                    </div>
                                    <div>
                                        <div className="font-medium text-gray-900 dark:text-white">{account.name}</div>
                                        <div className="text-sm text-gray-500 dark:text-gray-400">{account.email}</div>
                                    </div>
                                </div>
                                <Button variant="destructive" size="sm" onClick={() => disconnectAccount(account.id)}>Disconnect</Button>
                            </div>
                        ))}
                    </div>
                ) : (
                     <p className="text-sm text-gray-500 dark:text-gray-400">
                        {activeAccount?.provider === 'email' ? 'Connect a Google account to enable YouTube-specific features.' : 'No Google accounts are connected.'}
                    </p>
                )}
                <Button onClick={login} variant="outline" className="dark:text-white dark:border-gray-600 dark:hover:bg-gray-800">Connect New Google Account</Button>
            </CardContent>
        </Card>
    );
};


const AccountSettingsPage: React.FC<AccountSettingsPageProps> = ({ onNavigate }) => {
    const { activeAccount, addCredits, logout } = useContext(AuthContext);
    const { showToast } = useContext(ToastContext);

    if (!activeAccount) {
        return <p>Loading account details...</p>;
    }

    const handleBuyCredits = (amount: number) => {
        addCredits(amount);
        showToast({ message: `${amount} credits added to your account!`, variant: 'default' });
    };

    const creditPacks = [
        { amount: 100, price: 5 },
        { amount: 500, price: 20 },
        { amount: 1500, price: 50 },
    ];
    
    return (
        <div className="max-w-4xl mx-auto space-y-8">
            <div>
                <h2 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">Account Settings</h2>
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Manage your subscription, credits, and connected accounts.</p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Subscription & Credits</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Current Plan</p>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white">{activeAccount.plan}</p>
                        </div>
                        <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Remaining Credits</p>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white">{activeAccount.credits}</p>
                        </div>
                        <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Next Renewal</p>
                            <p className="text-xl font-bold text-gray-900 dark:text-white">
                               {activeAccount.planRenewalDate ? new Date(activeAccount.planRenewalDate).toLocaleDateString() : 'N/A'}
                            </p>
                        </div>
                    </div>
                     <Button onClick={() => onNavigate('pricing')} className="mt-6 bg-primary text-white hover:bg-primary/90">
                        Manage Subscription
                    </Button>
                </CardContent>
            </Card>
            
            <Card>
                <CardHeader>
                    <CardTitle>Buy More Credits</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {creditPacks.map(pack => (
                            <div key={pack.amount} className="p-4 text-center border border-gray-200 dark:border-gray-700 rounded-lg flex flex-col items-center">
                                <p className="text-2xl font-bold text-gray-900 dark:text-white">{pack.amount} Credits</p>
                                <p className="text-lg font-semibold text-primary">${pack.price}</p>
                                <Button onClick={() => handleBuyCredits(pack.amount)} className="mt-4 w-full bg-primary/20 dark:bg-primary/30 text-primary hover:bg-primary/30 dark:hover:bg-primary/40">
                                    Buy Now
                                </Button>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {activeAccount.provider === 'google' && <GoogleAccountsManager />}

             <Card>
                <CardHeader>
                    <CardTitle>Log Out</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">You are currently logged in as {activeAccount.email}.</p>
                    <Button onClick={logout} variant="destructive">
                        Log Out of Your Account
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
};

export default AccountSettingsPage;