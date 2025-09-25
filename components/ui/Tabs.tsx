import React from 'react';

const TabsContext = React.createContext<{
  activeTab: string | undefined;
  setActiveTab: (value: string) => void;
}>({
  activeTab: '',
  setActiveTab: () => {},
});

interface TabsProps {
  defaultValue?: string;
  value?: string;
  onValueChange?: (value: string) => void;
  children: React.ReactNode;
  className?: string;
}

export const Tabs: React.FC<TabsProps> = ({ defaultValue, value, onValueChange, children, className }) => {
  const [internalValue, setInternalValue] = React.useState(defaultValue);
  const isControlled = value !== undefined;
  
  const activeTab = isControlled ? value : internalValue;

  const setActiveTab = (newValue: string) => {
    if (!isControlled) {
      setInternalValue(newValue);
    }
    if (onValueChange) {
      onValueChange(newValue);
    }
  };

  return (
    <TabsContext.Provider value={{ activeTab, setActiveTab }}>
      <div className={className}>{children}</div>
    </TabsContext.Provider>
  );
};

export const TabsList: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
  <div className={`inline-flex h-10 items-center justify-center rounded-md bg-neutral-100 p-1 text-neutral-500 ${className}`}>
    {children}
  </div>
);

export const TabsTrigger: React.FC<{ value: string; children: React.ReactNode; className?: string }> = ({ value, children, className }) => {
  const { activeTab, setActiveTab } = React.useContext(TabsContext);
  const isActive = activeTab === value;
  return (
    <button
      onClick={() => setActiveTab(value)}
      className={`inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-white transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-950 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 ${
        isActive ? 'bg-white text-neutral-950 shadow-sm' : ''
      } ${className}`}
    >
      {children}
    </button>
  );
};

export const TabsContent: React.FC<{ value: string; children: React.ReactNode; className?: string }> = ({ value, children, className }) => {
  const { activeTab } = React.useContext(TabsContext);
  return activeTab === value ? <div className={`mt-2 ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-950 focus-visible:ring-offset-2 ${className}`}>{children}</div> : null;
};