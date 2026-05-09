import { ReactNode } from "react";

interface MobileLayoutProps {
  children: ReactNode;
  className?: string;
}

const MobileLayout = ({ children, className = "" }: MobileLayoutProps) => {
  return (
    <div className="min-h-screen bg-muted flex items-center justify-center p-4">
      <div className={`w-full max-w-[430px] min-h-[100dvh] relative rounded-2xl shadow-card bg-background ${className}`}>
        {children}
      </div>
    </div>
  );
};

export default MobileLayout;
