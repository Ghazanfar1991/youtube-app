import React from 'react';

const SelectContext = React.createContext<{
  open: boolean;
  setOpen: (open: boolean) => void;
  value: string;
  onValueChange: (value: string) => void;
}>({
  open: false,
  setOpen: () => {},
  value: '',
  onValueChange: () => {},
});

export const Select: React.FC<{
  children: React.ReactNode;
  value?: string;
  onValueChange?: (value: string) => void;
}> = ({ children, value = '', onValueChange = () => {} }) => {
  const [open, setOpen] = React.useState(false);
  return (
    <SelectContext.Provider value={{ open, setOpen, value, onValueChange }}>
      <div className="relative">{children}</div>
    </SelectContext.Provider>
  );
};

export const SelectTrigger: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => {
  const { open, setOpen } = React.useContext(SelectContext);
  return (
    <button
      onClick={() => setOpen(!open)}
      className={`flex h-10 w-full items-center justify-between rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm ring-offset-white placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-neutral-950 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${className || ''}`}
    >
      {children}
    </button>
  );
};

export const SelectValue: React.FC<{ placeholder?: string }> = ({ placeholder }) => {
    const { value } = React.useContext(SelectContext);
    const trigger = React.useContext(SelectContext);
    const children = React.Children.toArray((trigger as any).children);
    const selectedChild = children.find((child: any) => child.props.value === value);

    return <>{selectedChild ? (selectedChild as any).props.children : placeholder}</>
};

export const SelectContent: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => {
  const { open } = React.useContext(SelectContext);
  if (!open) return null;
  return (
    <div className={`absolute z-50 mt-1 min-w-[8rem] overflow-hidden rounded-md border bg-white text-neutral-950 shadow-md animate-in fade-in-80 ${className || ''}`}>
      <div className="p-1">{children}</div>
    </div>
  );
};

export const SelectItem: React.FC<{ value: string; children: React.ReactNode; className?: string }> = ({ value, children, className }) => {
  const { onValueChange, setOpen } = React.useContext(SelectContext);
  return (
    <div
      onClick={() => {
        onValueChange(value);
        setOpen(false);
      }}
      className={`relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none focus:bg-neutral-100 data-[disabled]:pointer-events-none data-[disabled]:opacity-50 hover:bg-neutral-100 ${className || ''}`}
    >
      {children}
    </div>
  );
};
