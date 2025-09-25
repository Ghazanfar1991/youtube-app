import React, { createContext, useContext, useState, ReactNode } from 'react';

interface DialogContextType {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

const DialogContext = createContext<DialogContextType | undefined>(undefined);

export const Dialog: React.FC<{ open?: boolean; onOpenChange?: (open: boolean) => void; children: ReactNode }> = ({ open, onOpenChange, children }) => {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = open !== undefined && onOpenChange !== undefined;
  const isOpen = isControlled ? open : internalOpen;
  const setIsOpen = isControlled ? onOpenChange : setInternalOpen;

  return <DialogContext.Provider value={{ isOpen, onOpenChange: setIsOpen }}>{children}</DialogContext.Provider>;
};

const useDialogContext = () => {
  const context = useContext(DialogContext);
  if (!context) throw new Error('useDialogContext must be used within a Dialog');
  return context;
};

export const DialogTrigger: React.FC<{ children: React.ReactElement; asChild?: boolean }> = ({ children, asChild }) => {
  const { onOpenChange } = useDialogContext();
  const child = React.Children.only(children);
  
  const handleClick = (e: React.MouseEvent) => {
      onOpenChange(true);
      // Fix: Property 'onClick' does not exist on type 'unknown'. (line 31)
      // The child's props are of an unknown type, so we must cast them to safely access and call onClick.
      const childProps = child.props as { onClick?: (e: React.MouseEvent) => void };
      if (childProps.onClick) {
          // Fix: Property 'onClick' does not exist on type 'unknown'. (line 32)
          childProps.onClick(e);
      }
  };

  if (asChild) {
    // FIX: Fix "No overload matches this call" error by using a more specific type assertion.
    // This informs TypeScript that the child element can accept an `onClick` prop,
    // which is necessary for `React.cloneElement` to work correctly.
    return React.cloneElement(child as React.ReactElement<{ onClick?: (e: React.MouseEvent) => void }>, { onClick: handleClick });
  }

  return <button onClick={() => onOpenChange(true)}>{children}</button>;
};


export const DialogContent: React.FC<{ children: ReactNode; className?: string }> = ({ children, className }) => {
  const { isOpen, onOpenChange } = useDialogContext();
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center animate-in fade-in-0"
      onClick={() => onOpenChange(false)}
    >
      <div
        className={`relative bg-white rounded-lg shadow-xl w-full max-w-lg m-4 ${className || ''} animate-in zoom-in-95`}
        onClick={e => e.stopPropagation()}
      >
        {children}
        <button onClick={() => onOpenChange(false)} className="absolute top-2 right-2 p-2 rounded-full hover:bg-neutral-100">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
        </button>
      </div>
    </div>
  );
};

export const DialogHeader: React.FC<{ children: ReactNode; className?: string }> = ({ children, className }) => (
  <div className={`p-6 border-b ${className || ''}`}>{children}</div>
);

export const DialogTitle: React.FC<{ children: ReactNode; className?: string }> = ({ children, className }) => (
  <h2 className={`text-lg font-semibold ${className || ''}`}>{children}</h2>
);