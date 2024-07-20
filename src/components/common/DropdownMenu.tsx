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

  return (
    <div className="dropdown" ref={dropdownRef}>
      {toggleButton ? (
        <div onClick={() => setIsOpen(!isOpen)}>{toggleButton}</div>
      ) : (
        <button className="dropdown-toggle" onClick={() => setIsOpen(!isOpen)}>
          ⋮
        </button>
      )}
      {isOpen && (
        <ul className="dropdown-menu">
          {options.map((option, index) => (
            <li
              key={index}
              onClick={() => {
                option.action();
                setIsOpen(false);
              }}>
              {option.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default DropdownMenu;
