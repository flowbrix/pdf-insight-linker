
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";

interface ProgressIndicatorsProps {
  uploadProgress: number;
  processingProgress: number;
}

const ProgressIndicators = ({ uploadProgress, processingProgress }: ProgressIndicatorsProps) => {
  if (uploadProgress === 0 && processingProgress === 0) return null;

  return (
    <div className="space-y-2">
      {uploadProgress > 0 && (
        <div className="space-y-1">
          <Label className="text-sm">Upload du document {uploadProgress}%</Label>
          <Progress value={uploadProgress} className="w-full" />
        </div>
      )}
      {processingProgress > 0 && (
        <div className="space-y-1">
          <Label className="text-sm">Traitement du document {processingProgress}%</Label>
          <Progress value={processingProgress} className="w-full" />
        </div>
      )}
    </div>
  );
};

export default ProgressIndicators;
