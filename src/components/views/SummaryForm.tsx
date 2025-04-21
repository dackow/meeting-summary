// src/components/views/SummaryForm.tsx
import * as React from "react";
import { useState, useRef, useEffect, useCallback } from "react";
// Assuming '@/components/ui/label' and '@/components/ui/textarea' resolve correctly after checking filesystem and tsconfig.json
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea"; // Corrected the path to match the project structure
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import type { CreateSummaryRequestDTO, UpdateSummaryRequestDTO } from "@/types";
// import { supabase } from "@/auth"; // No longer needed directly for API calls needing auth token
import { apiService } from "@/lib/apiService"; // Import the apiService

interface SummaryFormProps {
  mode: "create" | "edit";
  summaryId?: string; // Required in 'edit' mode
}

const SummaryForm: React.FC<SummaryFormProps> = ({ mode, summaryId }) => {
  const [transcription, setTranscription] = useState("");
  const [summary, setSummary] = useState("");
  const [notes, setNotes] = useState<string | null>(""); // Initialize as empty string or null
  const [fileName, setFileName] = useState<string | null>(null); // For display in edit mode / payload in create
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null); // For edit mode initial load error
  const [actionError, setActionError] = useState<string | null>(null); // For summarize/save errors
  const [isLLMGenerated, setIsLLMGenerated] = useState(false); // Track if current summary was LLM generated
  const [isInitialLoading, setIsInitialLoading] = useState(mode === "edit"); // Loading state for initial fetch in edit mode

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch summary details in edit mode
  const fetchSummary = useCallback(async (id: string) => {
    setIsInitialLoading(true);
    setLoadError(null); // Clear previous load errors
    try {
      // Use the apiService to fetch data
      const data = await apiService.getSummaryDetails(id);
      setTranscription(data.transcription || "");
      setSummary(data.summary || "");
      setNotes(data.notes || ""); // Initialize with empty string if notes is null
      setFileName(data.file_name || data.title || `Podsumowanie ${id}`); // Display file name or title
      setIsLLMGenerated(data.llm_generated);
      setIsInitialLoading(false);
    } catch (err: unknown) {
      // Changed err: any to err: unknown
      console.error("Failed to fetch summary details:", err);
      // Display inline load error for edit mode
      // Use type guard to safely access message property
      const errorMessage = err instanceof Error ? err.message : String(err);
      setLoadError("Nie udało się załadować podsumowania do edycji. Spróbuj ponownie. Szczegóły: " + errorMessage);
      setIsInitialLoading(false);
    }
  }, []);

  // Effect to load data in edit mode
  useEffect(() => {
    if (mode === "edit" && summaryId) {
      fetchSummary(summaryId);
    } else if (mode === "create") {
      // Clear states for create mode
      setTranscription("");
      setSummary("");
      setNotes(""); // Clear notes to empty string for new entry
      setFileName(null);
      setIsLLMGenerated(false);
      setIsInitialLoading(false); // No initial loading in create mode
      setLoadError(null);
      setActionError(null);
      // Clear file input value as well
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }, [mode, summaryId, fetchSummary]); // Depend on mode, summaryId, and memoized fetchSummary

  // Clear action error when user starts typing in transcription or summary or notes
  const handleTranscriptionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setTranscription(e.target.value);
    setActionError(null); // Clear error when transcription changes
    // Decide if manual edit means it's no longer LLM generated?
    // Let's keep isLLMGenerated based on whether 'Podsumuj' was the *last* action populating summary.
  };

  const handleSummaryChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setSummary(e.target.value);
    setActionError(null); // Clear error when summary changes
    setIsLLMGenerated(false); // If user manually edits summary, it's not purely LLM generated anymore
  };

  const handleNotesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setNotes(e.target.value);
    setActionError(null); // Clear error when notes change
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    setActionError(null); // Clear action errors on new file upload

    if (file) {
      if (file.size > 1024 * 1024) {
        // 1MB limit
        // Correct toast usage: Use toast.error for error messages
        toast.error("Plik jest za duży (max 1 MB).");
        // Reset file input value to allow selecting the same file again after error
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
        setFileName(null);
        setTranscription(""); // Clear transcription as file is invalid
        setSummary(""); // Clear summary as transcription changed/failed
        setNotes(""); // Clear notes
        setIsLLMGenerated(false);
        return;
      }

      setFileName(file.name);
      setTranscription(""); // Clear old transcription
      setSummary(""); // Clear summary when a new transcription is loaded
      setNotes(""); // Clear notes
      setIsLLMGenerated(false); // Clear LLM status

      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        setTranscription(text);
        // Correct toast usage: Use toast.success for success messages
        toast.success(`Plik "${file.name}" wczytany.`);
      };
      reader.onerror = () => {
        setActionError("Nie udało się odczytać pliku.");
        setFileName(null);
        setTranscription("");
        setSummary("");
        setNotes("");
        setIsLLMGenerated(false);
        // Correct toast usage: Use toast.error for error messages
        toast.error(`Błąd odczytu pliku "${file?.name}".`);
      };
      reader.readAsText(file);
    } else {
      // File input was cancelled or cleared
      setFileName(null);
      setTranscription("");
      setSummary("");
      setNotes("");
      setIsLLMGenerated(false);
      setActionError(null); // Clear error if file input is cancelled/cleared
    }
    // Reset file input value when done processing (success or error)
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSummarize = async () => {
    // Basic validation before calling API
    const isBusy = isInitialLoading || isSummarizing || isSaving; // Recalculate locally
    if (!transcription.trim() || isBusy) return; // Check if transcription is empty or only whitespace

    setIsSummarizing(true);
    setActionError(null); // Clear previous action errors

    try {
      // apiService is updated to handle/skip auth based on MVP rules
      const result = await apiService.generateSummary({ transcription });
      setSummary(result.summary);
      setIsLLMGenerated(true); // Mark as LLM generated
      // Correct toast usage: Use toast.success for success messages
      toast.success("Podsumowanie wygenerowane pomyślnie.");
    } catch (err: unknown) {
      // Changed err: any to err: unknown
      // Explicitly type as any if error object structure is unknown
      console.error("Summarize error:", err);
      // Use type guard to safely access message property
      const errorMessage = err instanceof Error ? err.message : String(err);
      setActionError(`Błąd generowania podsumowania: ${errorMessage || "Nieznany błąd"}`);
      setSummary(""); // Clear summary on error
      setIsLLMGenerated(false); // Ensure flag is false on error
    } finally {
      setIsSummarizing(false);
    }
  };

  const handleSave = async () => {
    // Basic validation before calling API
    const isBusy = isInitialLoading || isSummarizing || isSaving; // Recalculate locally
    if (!summary.trim() || isBusy) return; // Check if summary is empty or only whitespace

    setIsSaving(true);
    setActionError(null); // Clear previous action errors

    try {
      if (mode === "create") {
        const payload: CreateSummaryRequestDTO = {
          file_name: fileName, // Include file name from state
          transcription: transcription, // Required
          summary: summary, // Required
          llm_generated: isLLMGenerated, // Use tracked status
          notes: notes === "" ? null : notes, // Include notes, ensure null if empty string
        };
        // Use apiService to create summary
        await apiService.createSummary(payload); // POST /api/summaries
        // Correct toast usage: Use toast.success for success messages
        toast.success("Podsumowanie zapisane.");
        window.location.href = "/summaries"; // Redirect after create save
      } else if (mode === "edit" && summaryId) {
        const payload: UpdateSummaryRequestDTO = {
          // file_name is not typically updated in edit mode based on plan display
          // If file_name should be updatable, add: file_name: fileName,
          transcription: transcription, // Include transcription for update
          summary: summary, // Include summary for update
          llm_generated: isLLMGenerated, // Include status in update
          notes: notes === "" ? null : notes, // Include notes, ensure null if empty string
        };
        // Use apiService to update summary
        await apiService.updateSummary(summaryId, payload); // PUT /api/summaries/{id}

        // Correct toast usage: Use toast.success for success messages
        toast.success("Zmiany zapisane.");
        // No redirect after edit save as per plan (user can click cancel/nav)
        setIsSaving(false); // Reset saving state on success if not redirecting
      }
    } catch (err: unknown) {
      // Changed err: any to err: unknown
      // Explicitly type as any if error object structure is unknown
      console.error("Save error:", err);
      // Display inline save error
      // Use type guard to safely access message property
      const errorMessage = err instanceof Error ? err.message : String(err);
      setActionError(`Błąd zapisu: ${errorMessage || "Nieznany błąd"}`);
      setIsSaving(false); // Reset saving state on error
    }
  };

  const handleCancel = () => {
    // Simple redirect, no confirmation needed as per plan
    window.location.href = "/summaries"; // Navigate back
  };

  // Determine if any major operation is in progress to disable controls
  const isBusy = isInitialLoading || isSummarizing || isSaving;
  // Determine if save button should be disabled (requires non-empty summary AND not busy)
  const isSaveDisabled = !summary.trim() || isBusy;
  // Determine if summarize button should be disabled (requires non-empty transcription AND not busy)
  const isSummarizeDisabled = !transcription.trim() || isBusy;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{mode === "create" ? "Nowe podsumowanie" : `Edytuj podsumowanie`}</h1>
      {/* Display title/file name in edit mode if available */}
      {mode === "edit" &&
        !isInitialLoading &&
        (fileName || summaryId) && ( // Only show if not initially loading
          // Added margin-bottom to separate from fields below
          <div className="text-lg font-semibold text-muted-foreground -mt-4 mb-4">{fileName || `ID: ${summaryId}`}</div>
        )}

      {/* Display initial load error in edit mode */}
      {loadError && mode === "edit" && <p className="text-sm font-medium text-red-500">{loadError}</p>}

      {/* Display spinner for initial load in edit mode */}
      {isInitialLoading ? (
        <div className="flex flex-col justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="mt-2 text-muted-foreground">Ładowanie podsumowania...</span>
        </div>
      ) : (
        <>
          {/* File Upload Section (only in create mode) */}
          {mode === "create" && (
            // Added margin-bottom to separate from transcription field
            <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-4 mb-4">
              <input
                id="file-upload"
                type="file"
                accept=".txt"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden" // Hide the default input
                disabled={isBusy} // Disable file input while busy
              />
              {/* Style label to look like a button */}
              <Label
                htmlFor="file-upload"
                className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 h-10 px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer"
                data-disabled={isBusy} // Use data-disabled for styling based on isBusy
              >
                Wczytaj plik TXT (max 1 MB)
              </Label>
              {fileName && <span className="text-sm text-muted-foreground">{fileName}</span>}
            </div>
          )}

          <div>
            <Label htmlFor="transcription">Transkrypcja</Label>
            <Textarea
              id="transcription"
              value={transcription}
              onChange={handleTranscriptionChange} // Use refined handler
              placeholder="Wklej lub wczytaj tekst transkrypcji tutaj..."
              rows={10}
              className="mt-1"
              disabled={isBusy}
            />
          </div>

          <div>
            <Label htmlFor="summary">Podsumowanie</Label>
            <Textarea
              id="summary"
              value={summary}
              onChange={handleSummaryChange}
              placeholder="Wygeneruj lub wpisz podsumowanie tutaj..."
              rows={6}
              className="mt-1"
              disabled={isBusy}
            />
          </div>

          {/* Notes field - Add this field */}
          <div>
            <Label htmlFor="notes">Notatki (opcjonalnie)</Label>
            <Textarea
              id="notes"
              value={notes || ""} // Use empty string for controlled component if notes is null
              onChange={handleNotesChange}
              placeholder="Dodaj dodatkowe notatki..."
              rows={3}
              className="mt-1"
              disabled={isBusy}
            />
          </div>

          {/* Display action-specific errors (e.g., LLM error, save error) */}
          {actionError && (
            // Added margin-top and positioned above action buttons
            <p className="text-sm font-medium text-red-500 mt-4 text-center">{actionError}</p>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row justify-end gap-2 pt-4">
            <Button variant="outline" onClick={handleCancel} disabled={isBusy}>
              Anuluj
            </Button>
            <Button onClick={handleSummarize} disabled={isSummarizeDisabled}>
              {isSummarizing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Podsumuj
            </Button>
            <Button onClick={handleSave} disabled={isSaveDisabled}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Zapisz
            </Button>
          </div>

          {/* Footer displaying ID in edit mode */}
          {mode === "edit" &&
            summaryId &&
            !isInitialLoading && ( // Only show if in edit mode and not initially loading
              <div className="text-sm text-muted-foreground mt-4 border-t pt-4 text-center">
                {" "}
                {/* Added border and padding top */}
                ID Podsumowania: {summaryId}
              </div>
            )}
        </>
      )}
    </div>
  );
};

export default SummaryForm;
