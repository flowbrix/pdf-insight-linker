
import { Outlet } from "react-router-dom";
import Navbar from "./Navbar";
import { SidebarProvider } from "@/components/ui/sidebar";

const Layout = () => {
  return (
    <div className="min-h-screen flex flex-col w-full bg-background">
      <SidebarProvider>
        <div className="flex flex-col w-full">
          <Navbar />
          <main className="flex-1 p-6">
            <Outlet />
          </main>
        </div>
      </SidebarProvider>
    </div>
  );
};

export default Layout;
