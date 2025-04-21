// src/components/layout/Topbar.tsx
import * as React from "react";
import {
  NavigationMenu,
  NavigationMenuList,
  NavigationMenuItem,
  NavigationMenuLink,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu";
import { Button } from "@/components/ui/button";
import { supabase } from "@/auth"; // Use the shared supabase client
import { toast } from "sonner"; // Assuming sonner for toast
import { Loader2 } from "lucide-react"; // For spinner
import { cn } from "@/lib/utils"; // Import cn helper

const Topbar: React.FC = () => {
  const [isLoggingOut, setIsLoggingOut] = React.useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    const { error } = await supabase.auth.signOut();
    setIsLoggingOut(false); // Reset loading state regardless of success/error

    if (error) {
      console.error("Logout Error:", error);
      // Poprawiony komunikat toast z prawidłowymi polskimi znakami
      toast("Wystąpił błąd podczas wylogowania.");

      // Don't redirect automatically on error, user might want to try again
    } else {
      // Supabase listener or server-side check might handle redirect,
      // but client-side redirect ensures promptness.
      window.location.href = "/login";
    }
  };

  return (
    <header className="bg-primary text-primary-foreground p-4 shadow-md">
      <div className="container mx-auto flex items-center justify-between">
        <div className="text-xl font-bold">Meeting Summarizer</div>
        <NavigationMenu>
          <NavigationMenuList>
            <NavigationMenuItem>
              {/* Text color changed to blue-600 in the previous step */}
              <NavigationMenuLink href="/summaries" className={cn(navigationMenuTriggerStyle(), "text-blue-600")}>
                Moje podsumowania
              </NavigationMenuLink>
            </NavigationMenuItem>
            <NavigationMenuItem>
              {/* Text color changed to blue-600 in the previous step */}
              <NavigationMenuLink href="/create" className={cn(navigationMenuTriggerStyle(), "text-blue-600")}>
                Nowe podsumowanie
              </NavigationMenuLink>
            </NavigationMenuItem>
            <NavigationMenuItem>
              {/* Use a button inside the nav item for the logout action */}
              {/* Text color changed to blue-300 in the previous step */}
              <Button
                variant="ghost"
                onClick={handleLogout}
                className="text-blue-300 hover:bg-primary/90"
                disabled={isLoggingOut}
              >
                {isLoggingOut && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Wyloguj
              </Button>
            </NavigationMenuItem>
          </NavigationMenuList>
        </NavigationMenu>
      </div>
    </header>
  );
};

export default Topbar;
