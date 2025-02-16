
import { FileText, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Document {
  id: string;
  file_name: string;
  file_path: string;
  sector: string;
  document_type: string;
  status: string;
  created_at: string;
}

interface DocumentListProps {
  documents: Document[];
  onDownload: (filePath: string, fileName: string) => void;
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'completed':
      return 'bg-green-500';
    case 'processing':
      return 'bg-blue-500';
    case 'error':
      return 'bg-red-500';
    default:
      return 'bg-yellow-500';
  }
};

const getStatusText = (status: string) => {
  switch (status) {
    case 'completed':
      return 'Traité';
    case 'processing':
      return 'En cours';
    case 'error':
      return 'Erreur';
    default:
      return 'En attente';
  }
};

export const DocumentList = ({ documents, onDownload }: DocumentListProps) => {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Nom du fichier</TableHead>
          <TableHead>Secteur</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Statut</TableHead>
          <TableHead>Date de création</TableHead>
          <TableHead>Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {documents?.map((doc) => (
          <TableRow key={doc.id}>
            <TableCell className="font-medium">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4" />
                {doc.file_name}
              </div>
            </TableCell>
            <TableCell>{doc.sector}</TableCell>
            <TableCell>{doc.document_type}</TableCell>
            <TableCell>
              <Badge variant="outline" className={`${getStatusColor(doc.status)} text-white`}>
                {getStatusText(doc.status)}
              </Badge>
            </TableCell>
            <TableCell>
              {new Date(doc.created_at).toLocaleDateString("fr-FR")}
            </TableCell>
            <TableCell>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => onDownload(doc.file_path, doc.file_name)}
                >
                  <Download className="w-4 h-4" />
                </Button>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};
