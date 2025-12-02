import React from 'react';
import Skeleton from './Skeleton';

const DashboardCardSkeleton = () => {
    return (
        <div className="bg-white rounded-xl shadow-sm p-4 h-32 flex flex-col justify-between border border-gray-100">
            <div className="flex justify-between items-start">
                <div className="space-y-2 w-full">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-3 w-16" />
                </div>
                <Skeleton className="h-8 w-8 rounded-full" />
            </div>
            <Skeleton className="h-5 w-12 rounded-full self-end" />
        </div>
    );
};

const DashboardSkeleton = () => {
    return (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6">
            {Array(10).fill(0).map((_, index) => (
                <DashboardCardSkeleton key={index} />
            ))}
        </div>
    );
};

export default DashboardSkeleton;
