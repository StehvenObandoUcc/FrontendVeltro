export const PageLoader = () => (
  <div className="flex justify-center items-center min-h-[50vh]">
    <div className="space-y-4 text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
      <p className="text-gray-600">Loading...</p>
    </div>
  </div>
);
