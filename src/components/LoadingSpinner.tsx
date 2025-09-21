export const LoadingSpinner = () => {
  return (
    <div className="flex items-center justify-center w-full h-full">
      <div className="relative">
        <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
        <div className="absolute inset-2 w-8 h-8 border-2 border-secondary/20 border-b-secondary rounded-full animate-spin" 
             style={{ animationDirection: 'reverse', animationDuration: '0.8s' }} />
      </div>
    </div>
  );
};