// src/components/views/SummaryList.tsx
import * as React from "react";
import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, ArrowUpDown, Edit, Trash2 } from "lucide-react";
import type { MeetingSummaryListEntryDto, ListSummariesCommand } from "@/types";
import { format, parseISO, subDays } from "date-fns";
import { pl } from "date-fns/locale";
import { apiService } from "@/lib/apiService";
import { toast } from "sonner";

const SummaryList: React.FC = () => {
  const today = new Date();
  const sevenDaysAgo = subDays(today, 7);

  const [summaries, setSummaries] = useState<MeetingSummaryListEntryDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterFromDate, setFilterFromDate] = useState<string>(format(sevenDaysAgo, "yyyy-MM-dd"));
  const [filterToDate, setFilterToDate] = useState<string>(format(today, "yyyy-MM-dd"));
  const [sortColumn, setSortColumn] = useState<ListSummariesCommand["sort_by"]>("created_at");
  const [sortOrder, setSortOrder] = useState<ListSummariesCommand["sort_order"]>("desc");

  const fetchSummaries = useCallback(async (params: ListSummariesCommand) => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await apiService.fetchSummaries(params);
      setSummaries(data);
    } catch (err: unknown) {
      console.error("Failed to fetch summaries:", err);
      setError("Nie udało się załadować listy podsumowań. Spróbuj ponownie później.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSummaries({
      from_dt: filterFromDate,
      to_dt: filterToDate,
      sort_by: sortColumn,
      sort_order: sortOrder,
    });
  }, [filterFromDate, filterToDate, sortColumn, sortOrder, fetchSummaries]);

  const handleSortChange = (column: ListSummariesCommand["sort_by"]) => {
    if (sortColumn === column) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortOrder("desc");
    }
  };

  const handleEditClick = (id: string) => {
    window.location.href = `/edit/${id}`;
  };

  const handleDeleteClick = async (id: string, title: string) => {
    if (confirm(`Czy na pewno chcesz usunąć podsumowanie "${title || id}"?`)) {
      try {
        await apiService.deleteSummary(id);
        toast.success(`Podsumowanie "${title || id}" usunięto.`);
        fetchSummaries({
          from_dt: filterFromDate,
          to_dt: filterToDate,
          sort_by: sortColumn,
          sort_order: sortOrder,
        });
      } catch (err: unknown) {
        console.error("Failed to delete summary:", err);
        if (err instanceof Error) {
          toast.error(`Nie udało się usunąć podsumowania "${title || id}". Szczegóły: ${err.message}`);
        } else {
          toast.error(`Nie udało się usunąć podsumowania "${title || id}". Szczegóły: Nieznany błąd.`);
        }
      }
    }
  };

  const handleCreateClick = () => {
    window.location.href = "/create";
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "-";
    try {
      const date = parseISO(dateString);
      return isNaN(date.getTime()) ? "Niepoprawna data" : format(date, "dd.MM.yyyy HH:mm", { locale: pl });
    } catch (e) {
      console.error("Failed to format date:", dateString, e);
      return "Błąd formatowania daty";
    }
  };

  return (
    <div className="space-y-6 bg-blue-200 p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Moje podsumowania</h1>
      </div>

      <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4 p-4 border rounded-md bg-card mt-4">
        <div className="flex flex-col gap-2 w-full sm:w-auto">
          <Label htmlFor="filterFrom">Utworzone od:</Label>
          <Input
            id="filterFrom"
            type="date"
            value={filterFromDate}
            onChange={(e) => setFilterFromDate(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-2 w-full sm:w-auto">
          <Label htmlFor="filterTo">Utworzone do:</Label>
          <Input id="filterTo" type="date" value={filterToDate} onChange={(e) => setFilterToDate(e.target.value)} />
        </div>
      </div>

      {error && <p className="text-sm font-medium text-red-500 mt-4">{error}</p>}

      <div className="border rounded-md overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead className="min-w-[150px]">Nazwa/Tytuł</TableHead>
              <TableHead
                className="cursor-pointer hover:text-primary min-w-[150px]"
                onClick={() => handleSortChange("created_at")}
              >
                <div className="flex items-center">
                  Data utworzenia
                  {sortColumn === "created_at" ? (
                    <ArrowUpDown className={`ml-1 h-4 w-4 inline-block ${sortOrder === "asc" ? "rotate-180" : ""}`} />
                  ) : (
                    <ArrowUpDown className="ml-1 h-4 w-4 inline-block text-muted-foreground opacity-50" />
                  )}
                </div>
              </TableHead>
              <TableHead
                className="cursor-pointer hover:text-primary min-w-[150px]"
                onClick={() => handleSortChange("updated_at")}
              >
                <div className="flex items-center">
                  Data modyfikacji
                  {sortColumn === "updated_at" ? (
                    <ArrowUpDown className={`ml-1 h-4 w-4 inline-block ${sortOrder === "asc" ? "rotate-180" : ""}`} />
                  ) : (
                    <ArrowUpDown className="ml-1 h-4 w-4 inline-block text-muted-foreground opacity-50" />
                  )}
                </div>
              </TableHead>
              <TableHead className="text-right min-w-[120px]">Akcje</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                  <span className="mt-2 block">Ładowanie...</span>
                </TableCell>
              </TableRow>
            ) : summaries.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                  Brak podsumowań do wyświetlenia.
                </TableCell>
              </TableRow>
            ) : (
              summaries.map((summary) => (
                <TableRow key={summary.id}>
                  <TableCell className="font-medium max-w-[200px] truncate">
                    {summary.title || summary.file_name || "Bez nazwy"}
                  </TableCell>
                  <TableCell>{formatDate(summary.created_at)}</TableCell>
                  <TableCell>{formatDate(summary.updated_at)}</TableCell>
                  <TableCell className="text-right flex gap-2 justify-end">
                    <Button variant="outline" size="sm" onClick={() => handleEditClick(summary.id)}>
                      <Edit className="h-4 w-4" />
                      <span className="sr-only sm:not-sr-only">Edytuj</span>
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDeleteClick(summary.id, summary.title || summary.file_name || "")}
                    >
                      <Trash2 className="h-4 w-4" />
                      <span className="sr-only sm:not-sr-only">Usuń</span>
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default SummaryList;
