import React from "react";

export default function VideoSidebarSkeleton() {
  return (
    <aside className="lg:w-1/3 space-y-4 animate-pulse">
      {[1, 2, 3].map((_, index) => (
        <div key={index} className="flex space-x-4">
          <div className="bg-gray-300 h-20 w-24 rounded-lg"></div>
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-gray-300 rounded w-3/4"></div>
            <div className="h-3 bg-gray-300 rounded w-1/2"></div>
          </div>
        </div>
      ))}
    </aside>
  );
}
