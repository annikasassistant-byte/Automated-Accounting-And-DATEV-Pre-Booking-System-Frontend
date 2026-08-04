"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { Button, buttonVariants } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { AuthFlowShell } from "@/components/auth/auth-flow-shell";
import { clearPasswordResetFlow, getResetToken } from "@/lib/password-reset-flow";
import { useResetPasswordMutation } from "@/services/authApi";
import { getApiErrorMessage } from "@/services/auth-mappers";
import { LoadingSkeleton } from "@/components/shared/loading-skeleton";

const schema = z
  .object({
    password: z
      .string()
      .min(8, "Mindestens 8 Zeichen")
      .regex(/[A-Za-z]/, "Muss einen Buchstaben enthalten")
      .regex(/[0-9]/, "Muss eine Zahl enthalten"),
    confirm: z.string(),
  })
  .refine((d) => d.password === d.confirm, {
    message: "Passwörter müssen übereinstimmen",
    path: ["confirm"],
  });

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [ready, setReady] = useState(false);
  const [resetToken, setResetTokenState] = useState<string | null>(null);
  const [resetPassword, { isLoading }] = useResetPasswordMutation();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema) });

  useEffect(() => {
    const fromQuery = searchParams.get("token");
    const fromSession = getResetToken();
    const token = fromQuery || fromSession;
    if (!token) {
      router.replace("/forgot-password");
      return;
    }
    setResetTokenState(token);
    setReady(true);
  }, [router, searchParams]);

  if (!ready || !resetToken) {
    return (
      <div className="mesh-background flex min-h-screen items-center justify-center">
        <div className="h-10 w-10 animate-pulse rounded-xl bg-primary/20" />
      </div>
    );
  }

  return (
    <AuthFlowShell
      step={3}
      title="Neues Passwort festlegen"
      description="Wählen Sie ein starkes Passwort. Sie verwenden es bei der nächsten Anmeldung."
    >
      <form
        className="space-y-5"
        onSubmit={handleSubmit(async (values) => {
          try {
            await resetPassword({
              resetToken,
              password: values.password,
            }).unwrap();
            clearPasswordResetFlow();
            toast.success("Passwort aktualisiert");
            router.push("/login");
          } catch (error) {
            toast.error(getApiErrorMessage(error, "Passwort konnte nicht zurückgesetzt werden"));
          }
        })}
      >
        <div className="space-y-2">
          <Label
            htmlFor="password"
            className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
          >
            Neues Passwort
          </Label>
          <PasswordInput id="password" className="h-11 rounded-xl" {...register("password")} />
          {errors.password && (
            <p className="text-sm text-destructive">{errors.password.message}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label
            htmlFor="confirm"
            className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
          >
            Passwort bestätigen
          </Label>
          <PasswordInput id="confirm" className="h-11 rounded-xl" {...register("confirm")} />
          {errors.confirm && (
            <p className="text-sm text-destructive">{errors.confirm.message}</p>
          )}
        </div>
        <Button type="submit" className="h-11 w-full rounded-xl" disabled={isLoading}>
          {isLoading ? "Wird aktualisiert…" : "Passwort aktualisieren"}
        </Button>
        <Link
          href="/login"
          className={cn(buttonVariants({ variant: "ghost" }), "w-full rounded-xl")}
        >
          Zurück zur Anmeldung
        </Link>
      </form>
    </AuthFlowShell>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<LoadingSkeleton variant="page" />}>
      <ResetPasswordForm />
    </Suspense>
  );
}
