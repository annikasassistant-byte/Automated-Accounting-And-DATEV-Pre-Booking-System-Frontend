import { Suspense } from "react";
import { LoginPage } from "@/features/auth/login-page";
import { LoadingSkeleton } from "@/components/shared/loading-skeleton";

export default function Page() {
  return (
    <Suspense fallback={<LoadingSkeleton variant="page" />}>
      <LoginPage />
    </Suspense>
  );
}
