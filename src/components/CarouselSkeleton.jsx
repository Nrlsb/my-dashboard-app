import React from 'react';
import Skeleton from './Skeleton';

const CarouselItemSkeleton = () => {
    return (
        <div className="flex-none w-full md:w-44 bg-white rounded-lg overflow-hidden border-b-[3px] border-gray-200 group flex flex-col h-auto aspect-square md:aspect-auto md:h-auto">
            <Skeleton className="w-full h-32 md:h-32" />
            <div className="p-3 md:p-4 flex-grow flex items-center justify-center md:block bg-white">
                <Skeleton className="h-4 w-3/4 mx-auto md:mx-0" />
            </div>
        </div>
    );
};

const CarouselSkeleton = ({ title }) => {
    return (
        <div className="relative py-4 mt-8">
            {title && <h2 className="text-2xl font-bold mb-4 text-espint-blue">{title}</h2>}
            <div className="flex overflow-x-auto gap-4 pb-4">
                {Array(6).fill(0).map((_, index) => (
                    <CarouselItemSkeleton key={index} />
                ))}
            </div>
        </div>
    );
};

export default CarouselSkeleton;
