import { motion } from 'motion/react';
import { Bell, User } from 'lucide-react';

export default function Navbar() {
  return (
    <header className="fixed top-0 w-full z-50 glass-nav">
      <div className="flex justify-between items-center h-16 px-8 max-w-[1280px] mx-auto w-full">
        <div className="flex items-center gap-8">
          <span className="text-xl font-black tracking-tighter text-on-surface font-headline">Ads Intel</span>
          <nav className="hidden md:flex items-center gap-6 font-headline tracking-tight font-medium">
            <a className="text-primary font-bold border-b-2 border-primary pb-1" href="#">Dashboard</a>
            <a className="text-on-surface-variant hover:text-on-surface transition-colors" href="#">Creatives</a>
            <a className="text-on-surface-variant hover:text-on-surface transition-colors" href="#">Campaigns</a>
            <a className="text-on-surface-variant hover:text-on-surface transition-colors" href="#">Profit</a>
          </nav>
        </div>
        <div className="flex items-center gap-4">
          <button className="p-2 text-on-surface-variant hover:opacity-80 transition-opacity active:scale-95 duration-200">
            <Bell size={20} />
          </button>
          <div className="w-8 h-8 rounded-full border border-outline-variant/30 overflow-hidden">
            <img 
              alt="User Avatar" 
              className="w-full h-full object-cover" 
              src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80"
              referrerPolicy="no-referrer"
            />
          </div>
        </div>
      </div>
    </header>
  );
}
