import React from 'react';

interface LoadingProps {
  message?: string;
  fullScreen?: boolean;
}

const Loading: React.FC<LoadingProps> = ({ message = 'A carregar...', fullScreen = false }) => {
  const containerClass = fullScreen 
    ? 'fixed inset-0 flex items-center justify-center bg-white bg-opacity-90 z-50' 
    : 'flex items-center justify-center p-8';

  return (
    <div className={containerClass}>
      <div className="flex flex-col items-center space-y-4">
        <div className="relative">
          <div className="w-12 h-12 border-4 border-blue-200 rounded-full animate-spin"></div>
          <div className="absolute top-0 left-0 w-12 h-12 border-4 border-blue-600 rounded-full animate-spin border-t-transparent"></div>
        </div>
        <p className="text-gray-600 font-medium">{message}</p>
      </div>
    </div>
  );
};

export default Loading;
