import { format } from 'date-fns';

interface InspectionReportNameParams {
  clientName?: string | null;
  assetName?: string | null;
  inspectionDate?: string | null;
}

function toDateLabel(dateValue?: string | null): string {
  if (!dateValue) return format(new Date(), 'dd-MM-yyyy');

  const parsed = new Date(dateValue);
  if (!Number.isNaN(parsed.getTime())) {
    return format(parsed, 'dd-MM-yyyy');
  }

  return dateValue;
}

export function buildInspectionReportFileName({
  clientName,
  assetName,
  inspectionDate,
}: InspectionReportNameParams): string {
  const safeClient = (clientName || 'Client').trim();
  const safeAsset = (assetName || 'Asset').trim();
  const dateLabel = toDateLabel(inspectionDate);
  const raw = `${safeClient}, ${safeAsset}, ${dateLabel}.pdf`;

  return raw.replace(/[/\\?%*:|"<>]/g, '-');
}
