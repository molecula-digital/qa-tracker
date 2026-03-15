"use client";

import { useRouter } from "next/navigation";
import { useSession, signOut } from "@/lib/auth-client";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

export default function SettingsPage() {
  const router = useRouter();
  const { data: session } = useSession();

  async function handleSignOut() {
    await signOut();
    router.push("/sign-in");
  }

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-semibold text-foreground">Settings</h1>

      {/* Account */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Account</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Name</p>
              <p className="text-sm text-foreground">{session?.user?.name ?? "--"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Email</p>
              <p className="text-sm text-foreground">{session?.user?.email ?? "--"}</p>
            </div>
          </div>
          <Separator />
          <Button variant="outline" size="sm" onClick={handleSignOut}>
            Sign out
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
