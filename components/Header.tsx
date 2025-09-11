import React, { useState } from 'react';
import type { User } from '../types';
import { ChevronDownIcon, LogOutIcon } from './icons';

interface HeaderProps {
  currentUser: User;
  onLogout: () => void;
}

const Header: React.FC<HeaderProps> = ({ currentUser, onLogout }) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);

  return (
    <header className="flex items-center justify-between h-20 bg-white shadow-sm px-6 flex-shrink-0 z-10">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Leave Approval System</h1>
        <p className="text-sm text-slate-500">Welcome back, {currentUser.name}!</p>
      </div>
      <div className="relative">
        <button
          onClick={() => setDropdownOpen(!dropdownOpen)}
          className="flex items-center space-x-2 p-2 rounded-lg hover:bg-slate-100 transition-colors"
        >
          <img
            className="w-10 h-10 rounded-full"
            src={`https://i.pravatar.cc/40?u=${currentUser.email}`}
            alt={currentUser.name}
          />
          <div className="text-left hidden md:block">
            <div className="font-semibold">{currentUser.name}</div>
            <div className="text-xs text-slate-500">{currentUser.role}</div>
          </div>
          <ChevronDownIcon className="w-5 h-5 text-slate-500" />
        </button>
        {dropdownOpen && (
          <div 
             className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl z-20"
             onMouseLeave={() => setDropdownOpen(false)}
          >
            <div className="p-2 border-b">
                <p className="text-sm font-semibold text-slate-700 px-2 pt-1">{currentUser.name}</p>
                <p className="text-xs text-slate-500 px-2 pb-1">{currentUser.email}</p>
            </div>
            <div className="p-2">
                 <button 
                    onClick={onLogout}
                    className="w-full text-left px-2 py-1.5 text-sm rounded-md hover:bg-slate-100 flex items-center text-slate-600"
                 >
                    <LogOutIcon className="w-4 h-4 mr-2" />
                    Logout
                 </button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
