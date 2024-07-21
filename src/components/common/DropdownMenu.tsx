import React, { useState, useRef, useEffect, ReactNode } from 'react';
import './DropdownMenu.css';

interface DropdownMenuProps {
  options: { label: string; action: () => void }[];
  toggleButton?: ReactNode;
}

const DropdownMenu: React.FC<DropdownMenuProps> = ({
  options,
  toggleButton,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsOpen(!isOpen);
  };

  const handleOptionClick = (e: React.MouseEvent, action: () => void) => {
    e.stopPropagation();
    action();
    setIsOpen(false);
  };

  return (
    <div
      className="dropdown"
      ref={dropdownRef}
      onClick={(e) => e.stopPropagation()}>
      {toggleButton ? (
        <div onClick={handleToggle}>{toggleButton}</div>
      ) : (
        <button className="dropdown-toggle" onClick={handleToggle}>
          ⋮
        </button>
      )}
      {isOpen && (
        <ul className="dropdown-menu">
          {options.map((option, index) => (
            <li
              key={index}
              onClick={(e) => handleOptionClick(e, option.action)}>
              {option.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default DropdownMenu;
