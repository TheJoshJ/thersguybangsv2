import React, { ReactNode } from "react";
import { Toaster } from "sonner";

interface LayoutProps {
  children: ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <main className="flex-grow">
        {children}
        <Toaster />
      </main>
    </div>
  );
};

export default Layout;
