import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Settings as SettingsIcon } from "lucide-react";

export default function SettingsPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-foreground">Settings</h1>
      <Card>
        <CardContent className="py-12 text-center">
          <SettingsIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-lg font-medium text-foreground">Coming Soon</h2>
          <p className="text-sm text-muted-foreground mt-2">System settings and configuration will be available here.</p>
        </CardContent>
      </Card>
    </div>
  );
}
