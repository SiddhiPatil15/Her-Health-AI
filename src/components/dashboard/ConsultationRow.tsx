interface ConsultationRowProps {
  doctorName: string;
  date: string;
  visitType: string;
  healthScore: string;
}

const ConsultationRow = ({ doctorName, date, visitType, healthScore }: ConsultationRowProps) => {
  return (
    <div className="flex items-center gap-4 py-4 border-b border-border last:border-0">
      <div className="w-10 h-10 rounded-full gradient-primary flex items-center justify-center text-caption font-semibold text-primary-foreground shrink-0">
        {doctorName.split(' ').map(n => n[0]).join('')}
      </div>
      <div className="flex-1 grid grid-cols-4 gap-4 items-center">
        <span className="text-body font-medium text-foreground">{doctorName}</span>
        <span className="text-body text-muted-foreground">{date}</span>
        <span className="text-body text-muted-foreground">{visitType}</span>
        <div className="flex items-center justify-between">
          <span className="text-body text-foreground">{healthScore}</span>
          <button className="text-caption font-medium text-primary hover:text-primary/80 transition-colors">
            View Report
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConsultationRow;
