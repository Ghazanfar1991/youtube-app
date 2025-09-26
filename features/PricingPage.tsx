
import React, { useContext } from 'react';
import { Check } from '../components/icons';
import { AuthContext } from '../contexts/AuthContext';
import { Page } from '../App';

interface PricingPageProps {
    onNavigate: (page: Page) => void;
}

const PricingCard: React.FC<{
  plan: string;
  price: string;
  description: string;
  features: string[];
  isPopular?: boolean;
  action: () => void;
  actionLabel: string;
  isCurrentPlan: boolean;
}> = ({ plan, price, description, features, isPopular, action, actionLabel, isCurrentPlan }) => (
  <div className={`relative flex flex-col p-8 rounded-2xl shadow-lg ${isPopular ? 'bg-primary/10 dark:bg-primary/20 border-2 border-primary' : 'bg-white dark:bg-gray-900/50'}`}>
    {isPopular && (
      <div className="absolute top-0 -translate-y-1/2 bg-primary text-white text-xs font-semibold px-3 py-1 rounded-full">
        Most Popular
      </div>
    )}
    <h3 className="text-2xl font-bold">{plan}</h3>
    <p className="mt-4 text-gray-500 dark:text-gray-400">{description}</p>
    <div className="mt-6">
      <span className="text-4xl font-bold">{price}</span>
      {price !== 'Free' && <span className="text-base font-medium text-gray-500 dark:text-gray-400">/month</span>}
    </div>
    <ul className="mt-8 space-y-4 flex-1">
      {features.map((feature, index) => (
        <li key={index} className="flex items-center">
          <Check className="h-6 w-6 text-primary" />
          <span className="ml-3 text-gray-700 dark:text-gray-300">{feature}</span>
        </li>
      ))}
    </ul>
    <button 
      onClick={action}
      disabled={isCurrentPlan}
      className={`mt-8 w-full py-3 px-6 rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
        isCurrentPlan
         ? 'bg-gray-500 text-white'
         : isPopular 
         ? 'bg-primary text-white hover:bg-primary/90' 
         : 'bg-primary/20 dark:bg-primary/30 text-primary hover:bg-primary/30 dark:hover:bg-primary/40'}`
      }
    >
      {isCurrentPlan ? 'Current Plan' : actionLabel}
    </button>
  </div>
);

const FAQItem: React.FC<{ question: string; children: React.ReactNode }> = ({ question, children }) => (
    <div>
        <h4 className="text-lg font-semibold">{question}</h4>
        <p className="mt-2 text-gray-600 dark:text-gray-400">{children}</p>
    </div>
);


const PricingPage: React.FC<PricingPageProps> = ({ onNavigate }) => {
  const { activeAccount, changePlan } = useContext(AuthContext);

  const handleChoosePlan = (plan: 'Pro' | 'Max' | 'Free') => {
      if (!activeAccount) {
          onNavigate('signup');
      } else {
          if (plan !== 'Free') {
              changePlan(plan);
          }
      }
  };

  return (
    <div className="py-12">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h1 className="text-4xl font-extrabold tracking-tight text-gray-900 dark:text-white sm:text-5xl">
            Flexible plans for everyone
          </h1>
          <p className="mt-4 max-w-2xl mx-auto text-lg text-gray-500 dark:text-gray-400">
            Choose a plan that works for you. Start for free and upgrade as you grow.
          </p>
        </div>
        
        <div className="mt-12 grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
          <PricingCard
            plan="Free"
            price="Free"
            description="For individuals starting out and exploring ThumbGenius."
            features={[
                '15 credits to start',
                'Basic thumbnail generation',
                'Standard support'
            ]}
            action={() => handleChoosePlan('Free')}
            actionLabel="Get Started"
            isCurrentPlan={activeAccount?.plan === 'Free'}
          />
          <PricingCard
            plan="Pro"
            price="$15"
            description="For content creators and professionals who need more power."
            features={[
                '200 credits per month',
                'Advanced AI models',
                'Image editing features',
                'Priority support'
            ]}
            isPopular
            action={() => handleChoosePlan('Pro')}
            actionLabel={activeAccount ? "Upgrade to Pro" : "Choose Pro"}
            isCurrentPlan={activeAccount?.plan === 'Pro'}
          />
          <PricingCard
            plan="Max"
            price="$29"
            description="For power users and small teams with high-volume needs."
            features={[
                '500 credits per month',
                'Access to newest features',
                'Team collaboration tools',
                'Dedicated account manager'
            ]}
            action={() => handleChoosePlan('Max')}
            actionLabel={activeAccount ? "Upgrade to Max" : "Choose Max"}
            isCurrentPlan={activeAccount?.plan === 'Max'}
          />
        </div>

        <div className="mt-20">
          <h2 className="text-3xl font-bold text-center">Frequently Asked Questions</h2>
            <div className="mt-10 max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-10">
                <FAQItem question="What counts as a credit?">
                    Generating or editing a thumbnail costs 1 credit. Extracting an existing thumbnail from a video is free. This simple system lets you experiment without worrying about complex calculations.
                </FAQItem>
                <FAQItem question="Can I cancel my subscription?">
                    Yes, you can cancel your subscription at any time. You will retain access to your plan's features until the end of the current billing period.
                </FAQItem>
                <FAQItem question="What happens if I go over my credit limit?">
                    On the Pro and Max plans, you'll have the option to purchase additional credit packs if you run out before your monthly renewal.
                </FAQItem>
                <FAQItem question="Do unused credits roll over?">
                    Credits do not roll over to the next month. Your credit balance resets at the start of each billing cycle for Pro and Max plans.
                </FAQItem>
            </div>
        </div>

      </div>
    </div>
  );
};

export default PricingPage;
