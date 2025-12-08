import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

const CustomSelect = ({ options, value, onChange, placeholder = 'Seleccionar' }) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const handleSelect = (option) => {
        onChange(option);
        setIsOpen(false);
    };

    return (
        <div className="relative w-full" ref={dropdownRef}>
            {/* Trigger Button */}
            <div
                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm cursor-pointer flex items-center justify-between focus:ring-2 focus:ring-espint-blue focus:border-espint-blue"
                onClick={() => setIsOpen(!isOpen)}
            >
                <span className={`block truncate ${!value ? 'text-gray-500' : 'text-gray-900'}`}>
                    {(() => {
                        if (!value) return placeholder;
                        const selectedOption = options.find(opt =>
                            (typeof opt === 'object' ? opt.value : opt) === value
                        );
                        return selectedOption ? (typeof selectedOption === 'object' ? selectedOption.label : selectedOption) : value;
                    })()}
                </span>
                <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isOpen ? 'transform rotate-180' : ''}`} />
            </div>

            {/* Dropdown Menu */}
            {isOpen && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
                    {/* Default "Clear" Option */}
                    <div
                        className="px-3 py-2 cursor-pointer hover:bg-gray-100 text-gray-500 italic text-sm border-b border-gray-100"
                        onClick={() => handleSelect('')}
                    >
                        {placeholder} (Todas)
                    </div>

                    {options.map((option, index) => {
                        const isObject = typeof option === 'object' && option !== null;
                        const label = isObject ? option.label : option;
                        const val = isObject ? option.value : option;
                        const isSelected = value === val;

                        return (
                            <div
                                key={index}
                                className={`px-3 py-2 cursor-pointer hover:bg-gray-50 flex items-center justify-between text-sm ${isSelected ? 'bg-blue-50 text-espint-blue font-medium' : 'text-gray-700'}`}
                                onClick={() => handleSelect(val)}
                            >
                                <span className="truncate mr-2">{label}</span>
                                {isSelected && <Check className="w-4 h-4 text-espint-blue flex-shrink-0" />}
                            </div>
                        );
                    })}

                    {options.length === 0 && (
                        <div className="px-3 py-2 text-gray-400 text-sm text-center">
                            No hay opciones
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default CustomSelect;
