import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, ArrowRight } from 'lucide-react';

const NewReleasesBanner = () => {
    const navigate = useNavigate();

    return (
        <div
            onClick={() => navigate('/new-releases')}
            className="
            group cursor-pointer 
            bg-gradient-to-b from-indigo-600 to-purple-700 
            text-white 
            rounded-3xl p-4 
            shadow-lg hover:shadow-2xl 
            transition-all duration-300 transform hover:scale-[1.02]
            flex flex-row md:flex-col items-center justify-between md:justify-center 
            w-full md:w-64 lg:w-72
            h-full md:h-auto md:flex-grow min-h-[500px]
            mb-4 md:mb-0
            relative overflow-hidden
        "
        >
            {/* Decorative background elements */}
            <div className="absolute top-0 left-0 w-full h-full bg-white opacity-5 rounded-3xl pointer-events-none"></div>
            <div className="absolute -top-10 -right-10 w-20 h-20 bg-purple-400 rounded-full blur-2xl opacity-30 group-hover:opacity-50 transition-opacity"></div>

            <div className="flex items-center md:flex-col gap-3 z-10 md:mt-auto md:mb-auto">
                <div className="p-2 bg-white/20 rounded-full backdrop-blur-sm group-hover:scale-110 transition-transform">
                    <Sparkles className="w-6 h-6 text-yellow-300" />
                </div>

                {/* Horizontal Text for Mobile */}
                <div className="block md:hidden font-bold text-lg">
                    Nuevos Lanzamientos
                </div>
            </div>

            <div className="mt-0 md:mt-4 md:mb-2 opacity-80 group-hover:opacity-100 transition-opacity">
                <ArrowRight className="w-5 h-5 md:rotate-90 md:w-6 md:h-6" />
            </div>
        </div>
    );
};

export default NewReleasesBanner;
