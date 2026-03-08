import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown } from 'lucide-react';

const MENU_ITEMS = [
    {
        title: 'PINTURA',
        categoryId: 'PINTURA',
        subcategories: [
            { id: 'FUNC_PINT_METAL', name: 'METAL' },
            { id: 'FUNC_PINT_INTERIOR', name: 'INTERIOR' },
            { id: 'FUNC_PINT_TECHOS', name: 'TECHOS' },
            { id: 'FUNC_PINT_PISOS', name: 'PISOS' },
            { id: 'FUNC_PINT_ESPECIALES', name: 'ESPECIALES' },
            { id: 'FUNC_PINT_MADERA', name: 'MADERA' },
            { id: 'FUNC_PINT_PILETAS', name: 'PILETAS' },
            { id: 'FUNC_PINT_EXTERIOR', name: 'EXTERIOR' },
            { id: 'FUNC_PINT_LADRILLOS', name: 'LADRILLOS' }
        ]
    },
    {
        title: 'AUTOMOTOR',
        categoryId: 'AUTOMOTOR',
        subcategories: [
            { id: 'FUNC_AUTO_DETAILING', name: 'DETAILING' },
            { id: 'FUNC_AUTO_RO', name: 'R.O AUTOMOTIVE' },
            { id: 'FUNC_AUTO_PULIDO', name: 'PULIDO' },
            { id: 'FUNC_AUTO_ACCESORIOS', name: 'ACCESORIOS' }
        ]
    },
    {
        title: 'ACCESORIOS',
        categoryId: 'ACCESORIOS',
        subcategories: [
            { id: 'FUNC_ACC_DISCOS', name: 'DISCOS' },
            { id: 'FUNC_ACC_LIJAS', name: 'LIJAS' },
            { id: 'FUNC_ACC_RODILLOS', name: 'RODILLOS' },
            { id: 'FUNC_ACC_PINCELES', name: 'PINCELES' },
            { id: 'FUNC_ACC_CINTAS', name: 'CINTAS' },
            { id: 'FUNC_ACC_COMPLEMENTOS', name: 'COMPLEMENTOS' },
            { id: 'FUNC_ACC_PROTECCION', name: 'PROTECCION' }
        ]
    },
    {
        title: 'PREP. DE SUPERFICIES',
        categoryId: 'PREP_SUPERFICIES',
        subcategories: [
            { id: 'FUNC_PREP_SELLADORES', name: 'SELLADORES' },
            { id: 'FUNC_PREP_ENDUIDO', name: 'ENDUDIDO' },
            { id: 'FUNC_PREP_FIJADORES', name: 'FIJADORES' },
            { id: 'FUNC_PREP_REPARACION', name: 'REPARACIÓN' }
        ]
    },
    {
        title: 'AEROSOLES',
        categoryId: 'AEROSOLES',
        subcategories: [
            { id: 'FUNC_AERO_RUSTOLEUM', name: 'RUST OLEUM' },
            { id: 'FUNC_AERO_TERSUAVE', name: 'TERSUAVE' }
        ]
    }
];

const Navbar = () => {
    const [activeDropdown, setActiveDropdown] = useState(null);
    const navigate = useNavigate();

    const handleSubcategoryClick = (subcategoryId) => {
        // Navigate to products page with the functional category filter applied
        navigate(`/products?category=${subcategoryId}`);
        setActiveDropdown(null);
    };

    return (
        <nav className="bg-[#002244] text-white hidden md:block border-t border-white/10 w-full relative z-40">
            <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <ul className="flex items-center space-x-1 h-12">
                    {MENU_ITEMS.map((item) => (
                        <li
                            key={item.title}
                            className="relative h-full flex items-center group cursor-pointer"
                            onMouseEnter={() => setActiveDropdown(item.title)}
                            onMouseLeave={() => setActiveDropdown(null)}
                        >
                            <div
                                className={`flex items-center gap-1.5 px-4 h-full  transition-colors text-sm font-medium tracking-wide
                  ${activeDropdown === item.title ? 'bg-white text-[#002244]' : 'hover:bg-white/10'}`}
                            >
                                {item.title}
                            </div>

                            {/* Dropdown Menu */}
                            {activeDropdown === item.title && (
                                <div className="absolute left-0 top-full w-56 bg-white shadow-xl animate-in fade-in slide-in-from-top-2 z-50 py-2">
                                    <ul className="flex flex-col">
                                        {item.subcategories.map((sub) => (
                                            <li key={sub.id}>
                                                <button
                                                    onClick={() => handleSubcategoryClick(sub.id)}
                                                    className="w-full text-left px-5 py-2.5 text-sm text-gray-600 hover:text-[#002244] hover:bg-gray-50 transition-colors uppercase"
                                                >
                                                    {sub.name}
                                                </button>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </li>
                    ))}
                </ul>
            </div>
        </nav>
    );
};

export default Navbar;
