import React from 'react';
import Skeleton from './Skeleton';

const CarouselItemSkeleton = () => {
    return (
        <div className="flex-none w-44 bg-white rounded-lg overflow-hidden border border-gray-200">
            <Skeleton className="w-full h-32" />
            <div className="p-4 space-y-2">
                <Skeleton className="h-4 w-3/4" />
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
