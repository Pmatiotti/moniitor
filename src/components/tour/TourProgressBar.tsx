interface TourProgressBarProps {
  currentStep: number;
  totalSteps: number;
}

export const TourProgressBar = ({ currentStep, totalSteps }: TourProgressBarProps) => {
  const progress = ((currentStep + 1) / totalSteps) * 100;

  return (
    <div className="mt-4 space-y-2">
      <div className="flex justify-between items-center">
        <span className="text-xs text-muted-foreground">
          Passo {currentStep + 1} de {totalSteps}
        </span>
        <span className="text-xs font-medium text-primary">
          {Math.round(progress)}%
        </span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div 
          className="h-full bg-primary rounded-full transition-all duration-300 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>
      <div className="flex justify-center gap-1.5 pt-1">
        {Array.from({ length: totalSteps }).map((_, index) => (
          <div
            key={index}
            className={`w-2 h-2 rounded-full transition-all duration-200 ${
              index <= currentStep 
                ? 'bg-primary scale-100' 
                : 'bg-muted-foreground/30 scale-90'
            }`}
          />
        ))}
      </div>
    </div>
  );
};
