import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, FileText, Calendar } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function PDFExportCard() {
  const { toast } = useToast();
  const [selectedWeek, setSelectedWeek] = useState("1");
  const [loading, setLoading] = useState(false);

  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();

  const handleDownloadWeekly = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/export/week/${selectedWeek}/pdf`);
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to download PDF');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `HRCM-Week-${selectedWeek}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "PDF Downloaded",
        description: `Week ${selectedWeek} report downloaded successfully!`
      });
    } catch (error: any) {
      toast({
        title: "Download Failed",
        description: error.message || "Could not download PDF",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadMonthly = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/export/monthly/${currentMonth}/${currentYear}/pdf`);
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to download PDF');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `HRCM-Monthly-${currentMonth}-${currentYear}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "PDF Downloaded",
        description: `Monthly report for ${currentMonth}/${currentYear} downloaded!`
      });
    } catch (error: any) {
      toast({
        title: "Download Failed",
        description: error.message || "Could not download PDF",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-950/40 dark:to-purple-950/40">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          Export Reports
        </CardTitle>
        <CardDescription>Download your HRCM progress reports as PDF</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Weekly PDF Download */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Weekly Report</label>
          <div className="flex gap-2">
            <Select value={selectedWeek} onValueChange={setSelectedWeek}>
              <SelectTrigger className="flex-1" data-testid="select-week">
                <SelectValue placeholder="Select week" />
              </SelectTrigger>
              <SelectContent>
                {[1, 2, 3, 4, 5, 6, 7, 8].map(week => (
                  <SelectItem key={week} value={week.toString()}>
                    Week {week}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button 
              onClick={handleDownloadWeekly}
              disabled={loading}
              data-testid="button-download-weekly"
            >
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
          </div>
        </div>

        {/* Monthly PDF Download */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Monthly Report</label>
          <Button 
            onClick={handleDownloadMonthly}
            disabled={loading}
            className="w-full"
            variant="secondary"
            data-testid="button-download-monthly"
          >
            <Calendar className="h-4 w-4 mr-2" />
            Download {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
